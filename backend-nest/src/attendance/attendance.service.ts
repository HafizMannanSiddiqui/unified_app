import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkin(userId: number, state: string = 'manual', ip?: string, hostname?: string) {
    // Prevent double check-in: block if already checked in today without checkout
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM attendance
      WHERE user_id = ${userId}
        AND checkin_date = (NOW() AT TIME ZONE 'Asia/Karachi')::date
        AND checkout_time IS NULL
      LIMIT 1`;

    if (existing.length > 0) {
      return { error: 'Already checked in today. Please check out first.', alreadyCheckedIn: true };
    }

    // Auto-close any missed checkouts: set checkout = checkin + 12 hours
    await this.prisma.$executeRaw`
      UPDATE attendance
      SET checkout_date = (checkin_date + checkin_time + INTERVAL '12 hours')::date,
          checkout_time = (checkin_time + INTERVAL '12 hours')::time,
          checkout_state = 'auto',
          updated_at = NOW()
      WHERE user_id = ${userId}
        AND checkout_time IS NULL
        AND checkin_date < (NOW() AT TIME ZONE 'Asia/Karachi')::date`;

    // Use PKT (UTC+5) for time storage — consistent with old HRMS data
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO attendance (user_id, checkin_date, checkin_time, status, checkin_state, checkin_ip, checkin_hostname, created_at, updated_at)
      VALUES (${userId}, (NOW() AT TIME ZONE 'Asia/Karachi')::date, (NOW() AT TIME ZONE 'Asia/Karachi')::time, 1, ${state}::attendance_state_enum, ${ip || null}, ${hostname || null}, NOW(), NOW())
      RETURNING id, checkin_date as "checkinDate", checkin_time::text as "checkinTime"`;
    return result[0];
  }

  async checkout(userId: number, state: string = 'manual', ip?: string, hostname?: string) {
    // Find today's open check-in — use PKT for elapsed calc
    const records = await this.prisma.$queryRaw<any[]>`
      SELECT id, checkin_date, checkin_time::text as checkin_time,
             EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'Asia/Karachi') - (checkin_date + checkin_time))) as elapsed_seconds
      FROM attendance
      WHERE user_id = ${userId}
        AND checkout_time IS NULL
      ORDER BY checkin_date DESC, id DESC LIMIT 1`;

    if (!records.length) return null;

    const record = records[0];
    const elapsedSeconds = Number(record.elapsed_seconds);

    // Block checkout if > 12 hours have passed — auto-close instead
    if (elapsedSeconds > 43200) {
      // Auto-close at checkin + 12h
      await this.prisma.$executeRaw`
        UPDATE attendance
        SET checkout_date = (checkin_date + checkin_time + INTERVAL '12 hours')::date,
            checkout_time = (checkin_time + INTERVAL '12 hours')::time,
            checkout_state = 'auto',
            updated_at = NOW()
        WHERE id = ${record.id}`;

      return {
        error: `12-hour limit exceeded. Your session from ${record.checkin_time.slice(0, 5)} was auto-closed at +12h. Submit an Attendance Request to your lead if you need correction.`,
        autoClosedAt12h: true,
      };
    }

    // Block if checkin was from a previous day (even within 12h)
    const checkinDate = new Date(record.checkin_date).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (checkinDate < today && elapsedSeconds > 43200) {
      return {
        error: `Missed checkout from ${checkinDate}. Submit an Attendance Request to fix.`,
        missedCheckout: true,
      };
    }

    // Use PKT (UTC+5) for checkout time
    await this.prisma.$executeRaw`
      UPDATE attendance SET
        checkout_date = (NOW() AT TIME ZONE 'Asia/Karachi')::date,
        checkout_time = (NOW() AT TIME ZONE 'Asia/Karachi')::time,
        checkout_state = ${state}::attendance_state_enum,
        checkout_ip = ${ip || null},
        checkout_hostname = ${hostname || null},
        updated_at = NOW()
      WHERE id = ${record.id}`;
    return { id: record.id, message: 'Checked out successfully' };
  }

  // Auto-mark missed checkouts (run daily or on check-in) — cap at checkin + 12h
  async markMissedCheckouts() {
    const result = await this.prisma.$executeRaw`
      UPDATE attendance
      SET checkout_date = (checkin_date + checkin_time + INTERVAL '12 hours')::date,
          checkout_time = (checkin_time + INTERVAL '12 hours')::time,
          checkout_state = 'auto',
          updated_at = NOW()
      WHERE checkout_time IS NULL
        AND (checkin_date + checkin_time + INTERVAL '12 hours') < NOW()`;
    return { marked: result };
  }

  async getMyAttendance(userId: number, from: string, to: string) {
    // Merge same-day records: earliest check-in, latest checkout per day
    // This prevents duplicate rows when someone checks in multiple times
    return this.prisma.$queryRaw<any[]>`
      SELECT
        checkin_date as "checkinDate",
        MIN(checkin_time)::text as "checkinTime",
        MAX(checkout_date) as "checkoutDate",
        MAX(checkout_time)::text as "checkoutTime",
        MAX(status) as status,
        (array_agg(checkin_state ORDER BY checkin_time ASC))[1] as "checkinState",
        (array_agg(checkout_state ORDER BY checkout_time DESC NULLS LAST))[1] as "checkoutState",
        CASE
          WHEN MAX(checkout_time) IS NOT NULL AND MIN(checkin_time) IS NOT NULL THEN
            EXTRACT(EPOCH FROM (
              (MAX(checkout_date) + MAX(checkout_time)) - (checkin_date + MIN(checkin_time))
            ))
          ELSE NULL
        END as "durationSeconds",
        CASE
          WHEN MAX(checkout_time) IS NOT NULL AND MIN(checkin_time) IS NOT NULL
            AND EXTRACT(EPOCH FROM (
              (MAX(checkout_date) + MAX(checkout_time)) - (checkin_date + MIN(checkin_time))
            )) > 43200 THEN true
          ELSE false
        END as "suspicious",
        COUNT(*)::int as "entries"
      FROM attendance
      WHERE user_id = ${userId}
        AND checkin_date >= ${from}::date
        AND checkin_date <= ${to}::date
      GROUP BY checkin_date
      ORDER BY checkin_date DESC`;
  }

  async getDailyReport(date: string, teamId?: number) {
    const teamFilter = teamId ? `AND u.team_id = ${teamId}` : '';
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT a.id, a.user_id as "userId", a.checkin_date as "checkinDate",
             a.checkin_time::text as "checkinTime", a.checkout_time::text as "checkoutTime",
             a.checkin_state as "checkinState", a.status,
             json_build_object('username', u.username, 'displayName', u.display_name, 'teamId', u.team_id) as user
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      WHERE a.checkin_date = '${date}'::date ${teamFilter}
      ORDER BY a.checkin_time ASC`);
  }

  async getMonthlyReport(userId: number, year: number, month: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, checkin_date as "checkinDate", checkin_time::text as "checkinTime",
             checkout_time::text as "checkoutTime", checkin_state as "checkinState", status
      FROM attendance
      WHERE user_id = ${userId}
        AND EXTRACT(YEAR FROM checkin_date) = ${year}
        AND EXTRACT(MONTH FROM checkin_date) = ${month}
      ORDER BY checkin_date ASC`;
  }

  // --- Today's Team Dashboard (AMS-style) ---
  async getTodayDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All active users
    const allUsers = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, displayName: true, teamId: true, team: { select: { teamName: true } } },
      orderBy: { displayName: 'asc' },
    });

    // Today's attendance
    const todayAtt = await this.prisma.$queryRaw<any[]>`
      SELECT user_id as "userId", checkin_time::text as "checkinTime",
             checkout_time::text as "checkoutTime", checkin_state as "checkinState"
      FROM attendance
      WHERE checkin_date = CURRENT_DATE`;

    const attMap = new Map<number, any>();
    for (const a of todayAtt) attMap.set(a.userId, a);

    const available: any[] = [];
    const notAvailable: any[] = [];
    const pendingCheckout: any[] = [];

    for (const u of allUsers) {
      const att = attMap.get(u.id);
      if (att) {
        const entry = { ...u, checkinTime: att.checkinTime?.slice(0, 5), checkoutTime: att.checkoutTime?.slice(0, 5), via: att.checkinState };
        if (att.checkinTime && !att.checkoutTime) {
          pendingCheckout.push(entry);
          available.push(entry);
        } else {
          available.push(entry);
        }
      } else {
        notAvailable.push(u);
      }
    }

    return {
      date: today.toISOString().slice(0, 10),
      total: allUsers.length,
      available: { count: available.length, users: available },
      notAvailable: { count: notAvailable.length, users: notAvailable },
      pendingCheckout: { count: pendingCheckout.length, users: pendingCheckout },
    };
  }

  // --- Mark WFH (admin/lead assigns) ---
  async markWfh(userId: number, date: string, assignedBy: number) {
    // Check if already has attendance for this date
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM attendance WHERE user_id = ${userId} AND checkin_date = ${date}::date LIMIT 1`;
    if (existing.length > 0) return { error: 'Attendance already exists for this date' };

    await this.prisma.$executeRaw`
      INSERT INTO attendance (user_id, checkin_date, checkin_time, checkout_date, checkout_time, status, checkin_state, checkout_state, checkin_hostname, created_at, updated_at)
      VALUES (${userId}, ${date}::date, '09:00:00'::time, ${date}::date, '18:00:00'::time, 1, 'manual', 'manual', 'WFH', NOW(), NOW())`;
    return { success: true, message: `WFH marked for ${date}` };
  }

  // --- Kiosk attendance: verify user + auto mark checkin/checkout ---
  async kioskMarkAttendance(username: string, password: string) {
    // Import auth dependencies
    const argon2 = require('argon2');
    const { createHash } = require('crypto');

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, displayName: true, passwordHash: true, legacyPasswordMd5: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return { status: 'error', message: 'Invalid username or password' };
    }

    // Verify password (argon2 or legacy MD5)
    let authenticated = false;
    if (user.passwordHash?.startsWith('$argon2')) {
      authenticated = await argon2.verify(user.passwordHash, password);
    }
    if (!authenticated && user.legacyPasswordMd5) {
      const md5 = createHash('md5').update(password).digest('hex');
      authenticated = md5 === user.legacyPasswordMd5;
    }
    if (!authenticated) {
      return { status: 'error', message: 'Invalid username or password' };
    }

    // Check if already checked in today without checkout
    const pending = await this.prisma.$queryRaw<any[]>`
      SELECT id, checkin_time::text as "checkinTime"
      FROM attendance
      WHERE user_id = ${user.id}
        AND checkin_date = (NOW() AT TIME ZONE 'Asia/Karachi')::date
        AND checkout_time IS NULL
      LIMIT 1`;

    if (pending.length > 0) {
      // Already checked in → CHECK OUT
      await this.prisma.$executeRaw`
        UPDATE attendance SET
          checkout_date = (NOW() AT TIME ZONE 'Asia/Karachi')::date,
          checkout_time = (NOW() AT TIME ZONE 'Asia/Karachi')::time,
          checkout_state = 'manual',
          updated_at = NOW()
        WHERE id = ${pending[0].id}`;

      const now = await this.prisma.$queryRaw<any[]>`SELECT (NOW() AT TIME ZONE 'Asia/Karachi')::time::text as t`;
      return {
        status: 'checkout',
        message: `Checked out successfully!`,
        user: { name: user.displayName || user.username, username: user.username },
        checkinTime: pending[0].checkinTime?.slice(0, 8),
        checkoutTime: now[0].t?.slice(0, 8),
      };
    } else {
      // Not checked in → CHECK IN
      const result = await this.prisma.$queryRaw<any[]>`
        INSERT INTO attendance (user_id, checkin_date, checkin_time, status, checkin_state, created_at, updated_at)
        VALUES (${user.id}, (NOW() AT TIME ZONE 'Asia/Karachi')::date, (NOW() AT TIME ZONE 'Asia/Karachi')::time, 1, 'manual', NOW(), NOW())
        RETURNING checkin_time::text as "checkinTime"`;

      return {
        status: 'checkin',
        message: `Checked in successfully!`,
        user: { name: user.displayName || user.username, username: user.username },
        checkinTime: result[0].checkinTime?.slice(0, 8),
      };
    }
  }

  // --- Get holidays for a month (for calendar marking) ---
  async getHolidaysForMonth(year: number, month: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0);
    return this.prisma.holiday.findMany({
      where: {
        OR: [
          { fromDate: { gte: from, lte: to } },
          { toDate: { gte: from, lte: to } },
          { AND: [{ fromDate: { lte: from } }, { toDate: { gte: to } }] },
        ],
        isValid: true,
      },
    });
  }

  // --- Attendance Requests ---
  async findRequests(filters: { requesterId?: number; status?: number }) {
    const where: any = {};
    if (filters.requesterId) where.requesterId = filters.requesterId;
    if (filters.status !== undefined) where.status = filters.status;
    const results = await this.prisma.attendanceRequest.findMany({
      where,
      include: {
        requester: { select: { username: true, displayName: true } },
        approver: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Format time fields for display
    return results.map(r => ({
      ...r,
      checkinTime: r.checkinTime ? r.checkinTime.toISOString().slice(11, 19) : null,
      checkoutTime: r.checkoutTime ? r.checkoutTime.toISOString().slice(11, 19) : null,
    }));
  }

  async createRequest(data: any) {
    try {
      const result = await this.prisma.attendanceRequest.create({
        data: {
          requesterId: data.requesterId,
          attendanceType: data.attendanceType || 'full_day',
          checkinDate: data.checkinDate ? new Date(data.checkinDate) : null,
          checkinTime: data.checkinTime ? new Date(`1970-01-01T${data.checkinTime}`) : null,
          checkoutDate: data.checkoutDate ? new Date(data.checkoutDate) : data.checkinDate ? new Date(data.checkinDate) : null,
          checkoutTime: data.checkoutTime ? new Date(`1970-01-01T${data.checkoutTime}`) : null,
          description: data.description || null,
          status: 1,
        },
      });
      return result;
    } catch (e: any) {
      console.error('createRequest error:', e.message, 'Data:', JSON.stringify(data));
      throw e;
    }
  }

  async approveRequest(id: number, approverId: number) {
    const request = await this.prisma.attendanceRequest.update({
      where: { id },
      data: { status: 2, approverId },
      include: { requester: { select: { id: true } } },
    });

    // If the request has checkout info, update the actual attendance record
    if (request.checkinDate && request.requesterId) {
      const dateStr = new Date(request.checkinDate).toISOString().slice(0, 10);

      if (request.checkoutTime) {
        // Update checkout on the matching attendance record
        await this.prisma.$executeRaw`
          UPDATE attendance SET
            checkout_date = ${request.checkoutDate ? new Date(request.checkoutDate).toISOString().slice(0, 10) : dateStr}::date,
            checkout_time = ${new Date(request.checkoutTime).toISOString().slice(11, 19)}::time,
            checkout_state = 'manual',
            updated_at = NOW()
          WHERE user_id = ${request.requesterId}
            AND checkin_date = ${dateStr}::date
            AND (checkout_state = 'auto' OR checkout_time IS NULL)`;
      }

      if (request.checkinTime && !request.checkoutTime) {
        // Create new attendance record if it's a full attendance correction
        await this.prisma.$executeRaw`
          INSERT INTO attendance (user_id, checkin_date, checkin_time, status, checkin_state, created_at, updated_at)
          VALUES (${request.requesterId}, ${dateStr}::date,
            ${new Date(request.checkinTime).toISOString().slice(11, 19)}::time,
            1, 'manual', NOW(), NOW())
          ON CONFLICT DO NOTHING`;
      }
    }

    return request;
  }

  async findAllRequests(status?: number) {
    const where: any = {};
    if (status !== undefined) where.status = status;
    const results = await this.prisma.attendanceRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, username: true, displayName: true } },
        approver: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return results.map(r => ({
      ...r,
      checkinTime: r.checkinTime ? r.checkinTime.toISOString().slice(11, 19) : null,
      checkoutTime: r.checkoutTime ? r.checkoutTime.toISOString().slice(11, 19) : null,
    }));
  }

  // --- Weekend Assignments ---
  findWeekendAssignments(userId?: number, year?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (year) where.year = year;
    return this.prisma.weekendAssignment.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } }, assigner: { select: { username: true, displayName: true } } },
      orderBy: { weekendDate: 'desc' },
    });
  }

  createWeekendAssignment(data: { userId: number; weekendDate: string; weekendNumber: number; year: number; attendanceType: string; assignedBy: number }) {
    return this.prisma.weekendAssignment.create({
      data: {
        userId: data.userId,
        weekendDate: new Date(data.weekendDate),
        weekendNumber: data.weekendNumber,
        year: data.year,
        attendanceType: data.attendanceType as any,
        assignedBy: data.assignedBy,
      },
    });
  }

  deleteWeekendAssignment(id: number) {
    return this.prisma.weekendAssignment.delete({ where: { id } });
  }

  // --- Employees Report ---
  async getEmployeesReport(from: string, to: string, teamId?: number) {
    const teamFilter = teamId ? `AND u.team_id = ${teamId}` : '';
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u.username, u.display_name as "displayName",
             t.team_name as "teamName",
             COUNT(a.id)::int as "totalDays",
             COALESCE(SUM(EXTRACT(EPOCH FROM (
               (COALESCE(a.checkout_date, a.checkin_date) + COALESCE(a.checkout_time, a.checkin_time))
               - (a.checkin_date + a.checkin_time)
             )) / 3600), 0)::numeric(10,1) as "totalHours",
             COUNT(CASE WHEN a.checkout_state = 'auto' THEN 1 END)::int as "missedCheckouts"
      FROM users u
      LEFT JOIN attendance a ON a.user_id = u.id
        AND a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.is_active = true ${teamFilter}
      GROUP BY u.id, u.username, u.display_name, t.team_name
      ORDER BY u.display_name ASC`);
  }

  rejectRequest(id: number, approverId: number) {
    return this.prisma.attendanceRequest.update({
      where: { id },
      data: { status: 3, approverId },
    });
  }

  // ── GHOST EMPLOYEES (no activity, likely left) ──
  async getGhostEmployees(months = 6) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u.username, u.display_name as "displayName", u.email,
             t.team_name as "teamName", d.name as "designation",
             u.created_at as "createdAt",
             (SELECT MAX(a.checkin_date) FROM attendance a WHERE a.user_id = u.id) as "lastAttendance",
             (SELECT MAX(te.entry_date) FROM time_entries te WHERE te.user_id = u.id) as "lastGtl"
      FROM users u
      LEFT JOIN teams t ON t.id = u.team_id
      LEFT JOIN designations d ON d.id = u.designation_id
      WHERE u.is_active = true
        AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.user_id = u.id AND a.checkin_date >= '${cutoffStr}'::date)
        AND NOT EXISTS (SELECT 1 FROM time_entries te WHERE te.user_id = u.id AND te.entry_date >= '${cutoffStr}'::date)
      ORDER BY u.display_name`);
  }

  // ── Deactivate user (soft delete) ──
  async deactivateUser(userId: number) {
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return { success: true };
  }

  // ── PERSON DETAIL (for admin drill-down) ──
  async getPersonDetail(userId: number, from: string, to: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, email: true, team: { select: { teamName: true } }, designation: { select: { name: true } } },
    });

    // Attendance records
    const attendance = await this.prisma.$queryRaw<any[]>`
      SELECT checkin_date as "date", checkin_time::text as "checkinTime", checkout_time::text as "checkoutTime",
             checkin_state as "checkinState", checkout_state as "checkoutState",
             CASE WHEN checkout_time IS NOT NULL AND checkin_time IS NOT NULL THEN
               ROUND(EXTRACT(EPOCH FROM ((checkout_date + checkout_time) - (checkin_date + checkin_time))) / 3600, 1)
             END as "hours"
      FROM attendance WHERE user_id = ${userId} AND checkin_date >= ${from}::date AND checkin_date <= ${to}::date
      ORDER BY checkin_date ASC`;

    // Late arrivals (after 10:30)
    const lateArrivals = attendance.filter((a: any) => a.checkinTime && a.checkinTime > '10:30:00');

    // Missed checkouts
    const missedCheckouts = attendance.filter((a: any) => a.checkoutState === 'auto');

    // GTL entries
    const gtlEntries = await this.prisma.$queryRaw<any[]>`
      SELECT entry_date as "date", hours, status, description
      FROM time_entries WHERE user_id = ${userId} AND entry_date >= ${from}::date AND entry_date <= ${to}::date
      ORDER BY entry_date ASC`;

    // Days with attendance but no GTL
    const attDates = new Set(attendance.map((a: any) => new Date(a.date).toISOString().slice(0, 10)));
    const gtlDates = new Set(gtlEntries.map((e: any) => new Date(e.date).toISOString().slice(0, 10)));
    const noGtlDays = [...attDates].filter(d => !gtlDates.has(d));

    // Summary
    const totalDays = attendance.length;
    const totalHours = attendance.reduce((s: number, a: any) => s + (a.hours && a.checkoutState !== 'auto' ? Number(a.hours) : 0), 0);
    const avgHours = totalDays > missedCheckouts.length ? Math.round((totalHours / (totalDays - missedCheckouts.length)) * 10) / 10 : 0;
    const totalGtlHours = gtlEntries.reduce((s: number, e: any) => s + Number(e.hours), 0);

    // Attendance images
    const fs = require('fs');
    const imgDir = require('path').join(__dirname, '../../../frontend/public/images/attendance');
    const usernameClean = user?.username?.replace(/[^a-zA-Z0-9_\-]/g, '_') || '';
    let images: any[] = [];
    try {
      if (fs.existsSync(imgDir)) {
        const files = fs.readdirSync(imgDir).filter((f: string) => f.startsWith(usernameClean + '_'));
        images = files.map((f: string) => {
          const parts = f.replace('.jpg', '').split('_');
          const action = parts[parts.length - 1]; // checkin or checkout
          const date = parts.slice(1, parts.length - 1).join('-'); // date portion
          return { file: `/images/attendance/${f}`, date, action };
        });
      }
    } catch {}

    return {
      user,
      summary: { totalDays, totalHours: Math.round(totalHours * 10) / 10, avgHours, lateCount: lateArrivals.length, missedCount: missedCheckouts.length, gtlHours: Math.round(totalGtlHours * 10) / 10, noGtlDays: noGtlDays.length },
      attendance,
      lateArrivals,
      missedCheckouts,
      gtlEntries,
      noGtlDays,
      images,
    };
  }

  // ── TEAM LEAD INSIGHTS ──
  async getLeadInsights(from: string, to: string, teamId?: number) {
    const teamFilter = teamId ? `AND u.team_id = ${teamId}` : '';

    // 1. Present but no GTL logged
    const noGtl = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u.username, u.display_name as "displayName", t.team_name as "teamName",
             COUNT(DISTINCT a.checkin_date)::int as "daysPresent"
      FROM users u
      JOIN attendance a ON a.user_id = u.id AND a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.is_active = true ${teamFilter}
        AND NOT EXISTS (SELECT 1 FROM time_entries te WHERE te.user_id = u.id AND te.entry_date >= '${from}'::date AND te.entry_date <= '${to}'::date)
      GROUP BY u.id, u.username, u.display_name, t.team_name
      HAVING COUNT(DISTINCT a.checkin_date) >= 1
      ORDER BY COUNT(DISTINCT a.checkin_date) DESC`);

    // 2. Frequent missed checkouts
    const missedCheckouts = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u.username, u.display_name as "displayName", t.team_name as "teamName",
             COUNT(*)::int as "missedCount"
      FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN teams t ON t.id = u.team_id
      WHERE a.checkout_state = 'auto' AND a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
        AND u.is_active = true ${teamFilter}
      GROUP BY u.id, u.username, u.display_name, t.team_name
      ORDER BY COUNT(*) DESC`);

    // 3. Low hours (present but logging <4h/day avg)
    const lowHours = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id, u.username, u.display_name as "displayName", t.team_name as "teamName",
             SUM(te.hours)::numeric(10,1) as "totalHours",
             COUNT(DISTINCT te.entry_date)::int as "daysLogged",
             ROUND((SUM(te.hours) / GREATEST(COUNT(DISTINCT te.entry_date), 1))::numeric, 1) as "avgPerDay"
      FROM time_entries te JOIN users u ON u.id = te.user_id LEFT JOIN teams t ON t.id = u.team_id
      WHERE te.entry_date >= '${from}'::date AND te.entry_date <= '${to}'::date
        AND u.is_active = true ${teamFilter}
      GROUP BY u.id, u.username, u.display_name, t.team_name
      HAVING ROUND((SUM(te.hours) / GREATEST(COUNT(DISTINCT te.entry_date), 1))::numeric, 1) < 8
      ORDER BY "avgPerDay" ASC`);

    // 4. Suspicious long sessions
    const suspicious = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.display_name as "displayName", a.checkin_date as "date",
             a.checkin_time::text as "checkinTime", a.checkout_time::text as "checkoutTime",
             ROUND(EXTRACT(EPOCH FROM ((a.checkout_date + a.checkout_time) - (a.checkin_date + a.checkin_time))) / 3600, 1) as "hours"
      FROM attendance a JOIN users u ON u.id = a.user_id
      WHERE a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
        AND a.checkout_time IS NOT NULL
        AND EXTRACT(EPOCH FROM ((a.checkout_date + a.checkout_time) - (a.checkin_date + a.checkin_time))) > 43200
        AND u.is_active = true ${teamFilter}
      ORDER BY "hours" DESC LIMIT 50`);

    // 5. Pending GTL approvals summary
    const pendingApprovals = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.display_name as "displayName", t.team_name as "teamName",
             COUNT(*)::int as "pendingCount",
             MIN(te.entry_date) as "oldestEntry"
      FROM time_entries te JOIN users u ON u.id = te.user_id LEFT JOIN teams t ON t.id = u.team_id
      WHERE te.status = 0 AND u.is_active = true ${teamFilter}
      GROUP BY u.display_name, t.team_name
      ORDER BY COUNT(*) DESC`);

    // 6. Frequent late arrivals (after 10:30 AM = 15:30 in stored time, or 10:30 if PKT)
    const lateArrivals = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT u.display_name as "displayName", t.team_name as "teamName",
             COUNT(*)::int as "lateCount"
      FROM attendance a JOIN users u ON u.id = a.user_id LEFT JOIN teams t ON t.id = u.team_id
      WHERE a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
        AND a.checkin_time > '10:30:00'::time
        AND u.is_active = true ${teamFilter}
      GROUP BY u.display_name, t.team_name
      HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC`);

    return {
      noGtl: { count: noGtl.length, users: noGtl },
      missedCheckouts: { count: missedCheckouts.reduce((s: number, u: any) => s + u.missedCount, 0), users: missedCheckouts },
      lowHours: { count: lowHours.length, users: lowHours },
      suspicious: { count: suspicious.length, entries: suspicious },
      pendingApprovals: { count: pendingApprovals.reduce((s: number, u: any) => s + u.pendingCount, 0), users: pendingApprovals },
      lateArrivals: { count: lateArrivals.reduce((s: number, u: any) => s + u.lateCount, 0), users: lateArrivals },
    };
  }

  // Late Arrival Report (checkin after threshold)
  async getLateArrivals(from: string, to: string, teamId?: number, threshold = '15:30:00') {
    const teamFilter = teamId ? `AND u.team_id = ${teamId}` : '';
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT a.checkin_date as "checkinDate", a.checkin_time::text as "checkinTime",
             u.display_name as "displayName", u.username, t.team_name as "teamName"
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN teams t ON t.id = u.team_id
      WHERE a.checkin_date >= '${from}'::date AND a.checkin_date <= '${to}'::date
        AND a.checkin_time > '${threshold}'::time
        ${teamFilter}
      ORDER BY a.checkin_date DESC, a.checkin_time DESC`);
  }

  // My Team - who reports to me
  async getMyTeam(managerId: number) {
    const subordinates = await this.prisma.user.findMany({
      where: { reportTo: managerId, isActive: true },
      select: {
        id: true, username: true, displayName: true, email: true,
        team: { select: { teamName: true } },
        designation: { select: { name: true } },
      },
      orderBy: { displayName: 'asc' },
    });

    // Get today's attendance for each
    const today = new Date().toISOString().slice(0, 10);
    const result: any[] = [];
    for (const sub of subordinates) {
      const att = await this.prisma.$queryRaw<any[]>`
        SELECT checkin_time::text as "checkinTime", checkout_time::text as "checkoutTime"
        FROM attendance WHERE user_id = ${sub.id} AND checkin_date = ${today}::date
        ORDER BY checkin_time ASC LIMIT 1`;
      result.push({
        ...sub,
        todayCheckin: att[0]?.checkinTime?.slice(0, 5) || null,
        todayCheckout: att[0]?.checkoutTime?.slice(0, 5) || null,
        isPresent: att.length > 0,
      });
    }
    return result;
  }
}
