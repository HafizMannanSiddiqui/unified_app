import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ZKLib = require('node-zklib');

/**
 * ZKTeco Device Service
 *
 * Handles communication with ZKTeco fingerprint/RFID devices.
 * Each device is a TCP connection on port 4370.
 *
 * Capabilities:
 * - Connect/disconnect to device
 * - Get device info (serial, firmware, user count, log count)
 * - Get all users from device (uid, name, card number)
 * - Get all attendance logs from device
 * - Sync attendance logs into PostgreSQL
 * - Real-time event monitoring (push-based)
 */
@Injectable()
export class ZktecoService {
  private readonly logger = new Logger('ZKTeco');

  constructor(private prisma: PrismaService) {}

  // Create a ZKLib instance for a device
  private createInstance(ip: string, port = 4370) {
    return new ZKLib(ip, port, 10000, 4000);
  }

  // ── Test Connection ──
  async testConnection(deviceIp: string) {
    const zk = this.createInstance(deviceIp);
    try {
      await zk.createSocket();
      const info = await zk.getInfo();
      await zk.disconnect();
      return { status: 'success', message: `Connected to ${deviceIp}`, info };
    } catch (e: any) {
      return { status: 'error', message: `Failed to connect to ${deviceIp}: ${e.message}` };
    }
  }

  // ── Get Device Info ──
  async getDeviceInfo(deviceIp: string) {
    const zk = this.createInstance(deviceIp);
    try {
      await zk.createSocket();
      const info = await zk.getInfo();
      await zk.disconnect();
      return info;
    } catch (e: any) {
      throw new Error(`Cannot connect to ${deviceIp}: ${e.message}`);
    }
  }

  // ── Get Users from Device ──
  async getDeviceUsers(deviceIp: string) {
    const zk = this.createInstance(deviceIp);
    try {
      await zk.createSocket();
      const result = await zk.getUsers();
      await zk.disconnect();
      return result.data || [];
    } catch (e: any) {
      throw new Error(`Cannot get users from ${deviceIp}: ${e.message}`);
    }
  }

  // ── Get Attendance Logs from Device ──
  async getDeviceLogs(deviceIp: string) {
    const zk = this.createInstance(deviceIp);
    try {
      await zk.createSocket();
      const result = await zk.getAttendances();
      await zk.disconnect();
      return result.data || [];
    } catch (e: any) {
      throw new Error(`Cannot get logs from ${deviceIp}: ${e.message}`);
    }
  }

  // ── Sync Logs from Device → PostgreSQL ──
  async syncDevice(deviceId: number) {
    // Get device config
    const device = await this.prisma.setting.findUnique({ where: { id: deviceId } });
    if (!device || !device.value) throw new Error('Device not found');

    const ip = (device.value as any).ip;
    if (!ip) throw new Error('Device IP not configured');

    this.logger.log(`Syncing device: ${device.displayName} (${ip})`);

    // Get logs from device
    const logs = await this.getDeviceLogs(ip);
    this.logger.log(`Got ${logs.length} logs from device`);

    // Get device user → app user mapping
    const deviceUsers = await this.prisma.deviceUser.findMany();
    const uidToUserId = new Map<number, number>();
    for (const du of deviceUsers) {
      uidToUserId.set(du.uid, du.userId);
    }

    // Process each log entry
    let created = 0, skipped = 0;

    for (const log of logs) {
      const userId = uidToUserId.get(log.deviceUserId);
      if (!userId) { skipped++; continue; }

      const timestamp = new Date(log.recordTime);
      const dateStr = timestamp.toISOString().slice(0, 10);
      const timeStr = timestamp.toTimeString().slice(0, 8);

      // Smart duplicate prevention: check if this EXACT scan already exists
      const exactDup = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM attendance
        WHERE user_id = ${userId}
          AND (
            (checkin_date = ${dateStr}::date AND checkin_time = ${timeStr}::time)
            OR (checkout_date = ${dateStr}::date AND checkout_time = ${timeStr}::time)
          )
        LIMIT 1`;

      if (exactDup.length > 0) { skipped++; continue; } // Already synced this scan

      // Check if attendance exists for this user+date
      const existing = await this.prisma.$queryRaw<any[]>`
        SELECT id, checkout_time FROM attendance
        WHERE user_id = ${userId} AND checkin_date = ${dateStr}::date
        ORDER BY id DESC LIMIT 1`;

      if (existing.length === 0) {
        // First scan of the day = check-in
        await this.prisma.$executeRaw`
          INSERT INTO attendance (user_id, checkin_date, checkin_time, status, checkin_state,
            checkin_ip, checkin_hostname, created_at, updated_at)
          VALUES (${userId}, ${dateStr}::date, ${timeStr}::time, 1, 'rfid',
            ${ip}, ${device.displayName || ''}, NOW(), NOW())`;
        created++;
      } else if (!existing[0].checkout_time) {
        // Already checked in today, no checkout yet → this is checkout
        await this.prisma.$executeRaw`
          UPDATE attendance SET
            checkout_date = ${dateStr}::date,
            checkout_time = ${timeStr}::time,
            checkout_state = 'rfid',
            checkout_ip = ${ip},
            checkout_hostname = ${device.displayName || ''},
            updated_at = NOW()
          WHERE id = ${existing[0].id}`;
        created++;
      } else {
        skipped++; // Already has checkin + checkout for today
      }
    }

    this.logger.log(`Sync complete: ${created} created/updated, ${skipped} skipped`);
    return { device: device.displayName, ip, logsFromDevice: logs.length, created, skipped };
  }

  // ── Sync ALL active devices ──
  async syncAllDevices() {
    const devices = await this.prisma.setting.findMany({
      where: { isActive: true, name: { startsWith: 'device' } },
    });

    const results: any[] = [];
    for (const device of devices) {
      try {
        const result = await this.syncDevice(device.id);
        results.push(result);
      } catch (e: any) {
        results.push({ device: device.displayName, error: e.message });
      }
    }
    return results;
  }

  // ── Clear Attendance Logs on Device ──
  // WARNING: This deletes ALL logs from the physical device!
  // Only use AFTER you've confirmed both old AND new systems have synced.
  // The old PHP live server will LOSE unsynced data if you clear too early.
  async clearDeviceLogs(deviceIp: string, confirmPhrase: string) {
    if (confirmPhrase !== 'I_CONFIRM_CLEAR_DEVICE_LOGS') {
      return { status: 'error', message: 'Safety check failed. Pass confirmPhrase: "I_CONFIRM_CLEAR_DEVICE_LOGS"' };
    }
    const zk = this.createInstance(deviceIp);
    try {
      await zk.createSocket();
      await zk.clearAttendanceLog();
      await zk.disconnect();
      this.logger.warn(`DEVICE LOGS CLEARED: ${deviceIp}`);
      return { status: 'success', message: `Logs cleared on ${deviceIp}. Old PHP server will not get these logs anymore.` };
    } catch (e: any) {
      return { status: 'error', message: e.message };
    }
  }
}
