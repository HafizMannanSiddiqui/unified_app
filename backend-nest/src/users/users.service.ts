import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Get user's full team/manager info
  async getUserTeamsAndManagers(userId: number) {
    const teams = await this.prisma.$queryRaw<any[]>`
      SELECT utm.id, utm.role_in_team as "roleInTeam", utm.is_primary as "isPrimary",
             t.id as "teamId", t.team_name as "teamName"
      FROM user_team_memberships utm
      JOIN teams t ON t.id = utm.team_id
      WHERE utm.user_id = ${userId}
      ORDER BY utm.is_primary DESC, t.team_name ASC`;

    const managers = await this.prisma.$queryRaw<any[]>`
      SELECT um.id, um.is_primary as "isPrimary",
             u.id as "managerId", u.display_name as "managerName", u.username as "managerUsername"
      FROM user_managers um
      JOIN users u ON u.id = um.manager_id
      WHERE um.user_id = ${userId}
      ORDER BY um.is_primary DESC`;

    return { teams, managers };
  }

  // Helper: log change to employee_history
  private async logHistory(userId: number, fieldName: string, oldValue: string, newValue: string, changedBy: number) {
    await this.prisma.$executeRaw`
      INSERT INTO employee_history (user_id, field_name, old_value, new_value, changed_by, effective_date, created_at)
      VALUES (${userId}, ${fieldName}, ${oldValue}, ${newValue}, ${changedBy}, CURRENT_DATE, NOW())`;
  }

  // Add team membership
  async addTeamMembership(userId: number, teamId: number, roleInTeam?: string, isPrimary = false, changedBy?: number) {
    await this.prisma.$executeRaw`
      INSERT INTO user_team_memberships (user_id, team_id, role_in_team, is_primary, created_at)
      VALUES (${userId}, ${teamId}, ${roleInTeam || null}, ${isPrimary}, NOW())
      ON CONFLICT (user_id, team_id) DO UPDATE SET role_in_team = ${roleInTeam || null}, is_primary = ${isPrimary}`;
    if (changedBy) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId }, include: { parent: true } });
      const teamLabel = team?.parent ? `${team.parent.teamName} → ${team.teamName}` : team?.teamName || '';
      await this.logHistory(userId, 'team_added', '', teamLabel, changedBy);
    }
    return { success: true };
  }

  // Remove team membership
  async removeTeamMembership(id: number, changedBy?: number) {
    const membership = await this.prisma.$queryRaw<any[]>`
      SELECT utm.user_id, t.team_name, pt.team_name as parent_name
      FROM user_team_memberships utm
      JOIN teams t ON t.id = utm.team_id
      LEFT JOIN teams pt ON pt.id = t.parent_id
      WHERE utm.id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM user_team_memberships WHERE id = ${id}`;
    if (changedBy && membership[0]) {
      const label = membership[0].parent_name ? `${membership[0].parent_name} → ${membership[0].team_name}` : membership[0].team_name;
      await this.logHistory(membership[0].user_id, 'team_removed', label, '', changedBy);
    }
    return { success: true };
  }

  // Add manager
  async addManager(userId: number, managerId: number, isPrimary = false, changedBy?: number) {
    await this.prisma.$executeRaw`
      INSERT INTO user_managers (user_id, manager_id, is_primary, created_at)
      VALUES (${userId}, ${managerId}, ${isPrimary}, NOW())
      ON CONFLICT (user_id, manager_id) DO UPDATE SET is_primary = ${isPrimary}`;
    if (changedBy) {
      const mgr = await this.prisma.user.findUnique({ where: { id: managerId }, select: { displayName: true } });
      await this.logHistory(userId, 'manager_added', '', mgr?.displayName || '', changedBy);
    }
    return { success: true };
  }

  // Remove manager
  async removeManager(id: number, changedBy?: number) {
    const rel = await this.prisma.$queryRaw<any[]>`
      SELECT um.user_id, u.display_name as manager_name
      FROM user_managers um JOIN users u ON u.id = um.manager_id WHERE um.id = ${id}`;
    await this.prisma.$executeRaw`DELETE FROM user_managers WHERE id = ${id}`;
    if (changedBy && rel[0]) {
      await this.logHistory(rel[0].user_id, 'manager_removed', rel[0].manager_name, '', changedBy);
    }
    return { success: true };
  }

  // My Team - all people who report to me (from user_managers)
  async getMyTeamMembers(managerId: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT u.id, u.username, u.display_name as "displayName", u.email,
             t.team_name as "teamName", d.name as "designation",
             um.is_primary as "isPrimary"
      FROM user_managers um
      JOIN users u ON u.id = um.user_id
      LEFT JOIN teams t ON t.id = u.team_id
      LEFT JOIN designations d ON d.id = u.designation_id
      WHERE um.manager_id = ${managerId} AND u.is_active = true
      ORDER BY u.display_name ASC`;
  }

  // Contact Directory
  async getDirectory(search?: string, teamId?: number) {
    const where: any = { isActive: true };
    if (teamId) where.teamId = teamId;
    if (search) where.OR = [
      { displayName: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, username: true, displayName: true, email: true,
        team: { select: { teamName: true } },
        designation: { select: { name: true } },
        profile: { select: { contactNo: true, bloodGroup: true, picturePath: true, personalEmail: true } },
        deviceUser: { select: { cardNo: true, uid: true } },
      },
      orderBy: { displayName: 'asc' },
    });
  }

  // Holidays CRUD
  async getHolidays(year?: number) {
    const where: any = {};
    if (year) where.year = year;
    return this.prisma.holiday.findMany({ where, orderBy: { fromDate: 'asc' } });
  }

  async createHoliday(data: { year: number; fromDate: string; toDate: string; numberOfDays: number; description: string }) {
    return this.prisma.holiday.create({
      data: { year: data.year, fromDate: new Date(data.fromDate), toDate: new Date(data.toDate), numberOfDays: data.numberOfDays, description: data.description, isValid: true },
    });
  }

  async deleteHoliday(id: number) {
    return this.prisma.holiday.delete({ where: { id } });
  }

  // Dashboard notification counts for a user
  async getNotificationCounts(userId: number) {
    const [pendingApprovals, pendingLeaves, myPendingEntries] = await Promise.all([
      this.prisma.timeEntry.count({ where: { status: 0 } }),
      this.prisma.leave.count({ where: { status: 'pending' } }),
      this.prisma.timeEntry.count({ where: { userId, status: 0 } }),
    ]);
    return { pendingApprovals, pendingLeaves, myPendingEntries };
  }

  // ── Get user with all emails (merge duplicate accounts) ──
  async getUserWithAllEmails(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, email: true },
    });
    if (!user) return null;

    // Find other accounts with same display name
    const otherAccounts = await this.prisma.user.findMany({
      where: { displayName: user.displayName, id: { not: userId } },
      select: { email: true, username: true },
    });

    const allEmails = [user.email, ...otherAccounts.map(a => a.email)].filter(Boolean);
    const allUsernames = [user.username, ...otherAccounts.map(a => a.username)];

    return { ...user, allEmails: [...new Set(allEmails)], allUsernames: [...new Set(allUsernames)] };
  }

  // ── Manager history / tenure tracking ──
  async getManagerHistory(userId: number) {
    // Get current managers with assignment date
    const managers = await this.prisma.$queryRaw<any[]>`
      SELECT um.id, um.is_primary, um.created_at as "assignedSince",
             u.display_name as "managerName", u.username as "managerUsername",
             EXTRACT(DAY FROM (NOW() - um.created_at))::int as "daysSince"
      FROM user_managers um
      JOIN users u ON u.id = um.manager_id
      WHERE um.user_id = ${userId}
      ORDER BY um.is_primary DESC, um.created_at ASC`;

    return managers;
  }

  // ── Admin: Change employee role/team/manager (with history log) ──
  // Team Leads can only change their own team. Super admins can change anyone.
  async adminChangeEmployee(userId: number, fieldName: string, newValue: string, changedBy: number) {
    // Check if changer is super admin
    const changerRoles = await this.prisma.userHasRole.findMany({ where: { userId: changedBy }, include: { role: true } });
    const isSuperAdmin = changerRoles.some(r => ['super admin', 'Admin'].includes(r.role.name));

    if (!isSuperAdmin) {
      // Team Lead restrictions:
      // 1. Can only edit their reportees (via user_managers)
      const isReportee = await this.prisma.$queryRaw<any[]>`
        SELECT 1 FROM user_managers WHERE user_id = ${userId} AND manager_id = ${changedBy} LIMIT 1`;
      if (isReportee.length === 0) {
        return { error: 'You can only edit employees who report to you' };
      }
      // 2. Can only change designation — team/manager changes go through request workflow
      if (fieldName === 'team' || fieldName === 'reportTo') {
        return this.submitTeamChangeRequest({
          requestType: fieldName === 'team' ? 'add_to_team' : 'add_manager',
          targetUserId: userId,
          requestedBy: changedBy,
          teamName: fieldName === 'team' ? newValue : undefined,
          managerName: fieldName === 'reportTo' ? newValue : undefined,
          reason: `Lead requested ${fieldName} change to "${newValue}"`,
        });
      }
    }
    let oldValue = '';

    if (fieldName === 'designation') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { designation: true } });
      oldValue = user?.designation?.name || '';
      let desig = await this.prisma.designation.findFirst({ where: { name: newValue } });
      if (!desig) desig = await this.prisma.designation.create({ data: { name: newValue } });
      await this.prisma.user.update({ where: { id: userId }, data: { designationId: desig.id } });
      // Sync jobTitle in profile to match designation
      await this.prisma.$executeRaw`UPDATE profiles SET job_title = ${newValue}, updated_at = NOW() WHERE user_id = ${userId}`;
      await this.prisma.$executeRaw`
        UPDATE user_team_memberships SET role_in_team = ${newValue} WHERE user_id = ${userId} AND is_primary = true`;
    } else if (fieldName === 'team') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { team: true } });
      oldValue = user?.team?.teamName || '';
      let team = await this.prisma.team.findFirst({ where: { teamName: { contains: newValue, mode: 'insensitive' } } });
      if (!team) team = await this.prisma.team.create({ data: { teamName: newValue, isActive: true } });
      await this.prisma.user.update({ where: { id: userId }, data: { teamId: team.id } });
      await this.prisma.$executeRaw`
        INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at)
        VALUES (${userId}, ${team.id}, true, NOW())
        ON CONFLICT (user_id, team_id) DO UPDATE SET is_primary = true`;
    } else if (fieldName === 'reportTo') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { manager: true } });
      oldValue = user?.manager?.displayName || '';
      const manager = await this.prisma.user.findFirst({
        where: { OR: [{ displayName: { contains: newValue, mode: 'insensitive' } }, { username: newValue }] },
      });
      if (manager) {
        await this.prisma.user.update({ where: { id: userId }, data: { reportTo: manager.id } });
        await this.prisma.$executeRaw`
          INSERT INTO user_managers (user_id, manager_id, is_primary, created_at)
          VALUES (${userId}, ${manager.id}, true, NOW())
          ON CONFLICT (user_id, manager_id) DO UPDATE SET is_primary = true`;
      }
    }

    // Log the change in history
    await this.prisma.$executeRaw`
      INSERT INTO employee_history (user_id, field_name, old_value, new_value, changed_by, effective_date, created_at)
      VALUES (${userId}, ${fieldName}, ${oldValue}, ${newValue}, ${changedBy}, CURRENT_DATE, NOW())`;

    // Audit log
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (user_id, action, target_id, details, created_at)
      VALUES (${changedBy}, 'change_employee', ${userId}, ${`${fieldName}: "${oldValue}" → "${newValue}"`}, NOW())`;

    return { success: true, field: fieldName, oldValue, newValue };
  }

  // Get employee history (role/team/manager changes over time)
  async getEmployeeHistory(userId: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT eh.*, u.display_name as "changerName"
      FROM employee_history eh
      JOIN users u ON u.id = eh.changed_by
      WHERE eh.user_id = ${userId}
      ORDER BY eh.effective_date DESC, eh.created_at DESC`;
  }

  // ── Profile Change Requests ──
  async submitProfileChange(userId: number, fieldName: string, newValue: string) {
    // Get current value
    let oldValue = '';
    if (fieldName === 'designation') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { designation: true } });
      oldValue = user?.designation?.name || '';
    } else if (fieldName === 'reportTo') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { manager: true } });
      oldValue = user?.manager?.displayName || '';
    } else if (fieldName === 'team') {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { team: true } });
      oldValue = user?.team?.teamName || '';
    }

    return this.prisma.$executeRaw`
      INSERT INTO profile_change_requests (user_id, field_name, old_value, new_value, status, created_at)
      VALUES (${userId}, ${fieldName}, ${oldValue}, ${newValue}, 0, NOW())`;
  }

  async getMyChangeRequests(userId: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT pcr.*, u.display_name as "reviewerName"
      FROM profile_change_requests pcr
      LEFT JOIN users u ON u.id = pcr.reviewed_by
      WHERE pcr.user_id = ${userId}
      ORDER BY pcr.created_at DESC`;
  }

  async getPendingChangeRequests() {
    return this.prisma.$queryRaw<any[]>`
      SELECT pcr.*, u.display_name as "userName", u.username
      FROM profile_change_requests pcr
      JOIN users u ON u.id = pcr.user_id
      WHERE pcr.status = 0
      ORDER BY pcr.created_at DESC`;
  }

  async approveChangeRequest(id: number, reviewerId: number) {
    // Get the request
    const req = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM profile_change_requests WHERE id = ${id} AND status = 0`;
    if (req.length === 0) return { error: 'Request not found or already processed' };

    const r = req[0];

    // Apply the change
    if (r.field_name === 'designation') {
      // Find or create designation
      let desig = await this.prisma.designation.findFirst({ where: { name: r.new_value } });
      if (!desig) {
        desig = await this.prisma.designation.create({ data: { name: r.new_value } });
      }
      await this.prisma.user.update({ where: { id: r.user_id }, data: { designationId: desig.id } });
      // Also update team memberships role
      await this.prisma.$executeRaw`
        UPDATE user_team_memberships SET role_in_team = ${r.new_value} WHERE user_id = ${r.user_id} AND is_primary = true`;
    } else if (r.field_name === 'reportTo') {
      const manager = await this.prisma.user.findFirst({
        where: { OR: [{ displayName: { contains: r.new_value, mode: 'insensitive' } }, { username: r.new_value }] },
      });
      if (manager) {
        await this.prisma.user.update({ where: { id: r.user_id }, data: { reportTo: manager.id } });
        // Also update user_managers
        await this.prisma.$executeRaw`
          INSERT INTO user_managers (user_id, manager_id, is_primary, created_at)
          VALUES (${r.user_id}, ${manager.id}, true, NOW())
          ON CONFLICT (user_id, manager_id) DO UPDATE SET is_primary = true`;
      }
    } else if (r.field_name === 'team') {
      let team = await this.prisma.team.findFirst({ where: { teamName: { contains: r.new_value, mode: 'insensitive' } } });
      // Create new team if doesn't exist
      if (!team) {
        team = await this.prisma.team.create({ data: { teamName: r.new_value, isActive: true } });
      }
      if (team) {
        await this.prisma.user.update({ where: { id: r.user_id }, data: { teamId: team.id } });
        await this.prisma.$executeRaw`
          INSERT INTO user_team_memberships (user_id, team_id, is_primary, created_at)
          VALUES (${r.user_id}, ${team.id}, true, NOW())
          ON CONFLICT (user_id, team_id) DO UPDATE SET is_primary = true`;
      }
    }

    // Mark approved
    await this.prisma.$executeRaw`
      UPDATE profile_change_requests SET status = 1, reviewed_by = ${reviewerId}, reviewed_at = NOW() WHERE id = ${id}`;
    return { success: true };
  }

  async rejectChangeRequest(id: number, reviewerId: number) {
    await this.prisma.$executeRaw`
      UPDATE profile_change_requests SET status = 2, reviewed_by = ${reviewerId}, reviewed_at = NOW() WHERE id = ${id}`;
    return { success: true };
  }

  // Get all designations for dropdown
  async getAllDesignations() {
    const desigs = await this.prisma.designation.findMany({ select: { name: true }, distinct: ['name'], orderBy: { name: 'asc' } });
    return desigs.map(d => d.name);
  }

  // ── Device Management ──
  async getDevices() {
    return this.prisma.setting.findMany({ orderBy: { name: 'asc' } });
  }

  async createDevice(data: { name: string; displayName: string; description?: string; value: any }) {
    return this.prisma.setting.create({ data: { ...data, isActive: true } });
  }

  async updateDevice(id: number, data: { displayName?: string; description?: string; value?: any; isActive?: boolean }) {
    return this.prisma.setting.update({ where: { id }, data });
  }

  async getDeviceUsers(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cardNo: { contains: search } },
      ];
    }
    return this.prisma.deviceUser.findMany({
      where,
      include: { user: { select: { username: true, displayName: true, team: { select: { teamName: true } } } } },
      orderBy: { uid: 'asc' },
    });
  }

  async createDeviceUser(data: { uid: number; userId: number; name?: string; cardNo?: string }) {
    return this.prisma.deviceUser.create({ data });
  }

  async updateDeviceUser(id: number, data: { userId?: number; name?: string; cardNo?: string }) {
    return this.prisma.deviceUser.update({ where: { id }, data });
  }

  async deleteDeviceUser(id: number) {
    return this.prisma.deviceUser.delete({ where: { id } });
  }

  async findAll(page = 1, pageSize = 100, isActive?: boolean, search?: string) {
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          team: true, designation: true, roles: { include: { role: true } },
          profile: { select: { contactNo: true, cnic: true, bloodGroup: true, dateOfJoining: true } },
          deviceUser: { select: { cardNo: true, uid: true } },
        },
        orderBy: { displayName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { team: true, designation: true, roles: { include: { role: true } } },
    });
  }

  async create(data: {
    username: string; email?: string; displayName?: string;
    firstName?: string; lastName?: string; password: string;
    teamId?: number; designationId?: number; reportTo?: number;
    payrollCompany?: string; roleIds?: number[];
  }) {
    const hash = await argon2.hash(data.password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
    const { roleIds, password, ...rest } = data;
    const user = await this.prisma.user.create({
      data: { ...rest, passwordHash: hash },
    });
    if (roleIds?.length) {
      await this.prisma.userHasRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }
    return this.findOne(user.id);
  }

  async update(id: number, data: {
    email?: string; displayName?: string; firstName?: string; lastName?: string;
    teamId?: number; designationId?: number; reportTo?: number;
    payrollCompany?: string; isActive?: boolean; roleIds?: number[];
  }, changedBy?: number) {
    const { roleIds, ...rest } = data;

    // Track role changes
    if (roleIds !== undefined && changedBy) {
      const oldRoles = await this.prisma.userHasRole.findMany({ where: { userId: id }, include: { role: true } });
      const oldNames = oldRoles.map(r => r.role.name).sort().join(', ');
      const newNames = (await this.prisma.role.findMany({ where: { id: { in: roleIds } } })).map(r => r.name).sort().join(', ');
      if (oldNames !== newNames) {
        await this.logHistory(id, 'roles', oldNames, newNames, changedBy);
      }
    }

    // Track status changes
    if (data.isActive !== undefined && changedBy) {
      const current = await this.prisma.user.findUnique({ where: { id }, select: { isActive: true } });
      if (current && current.isActive !== data.isActive) {
        await this.logHistory(id, 'status', current.isActive ? 'Active' : 'Inactive', data.isActive ? 'Active' : 'Inactive', changedBy);
      }
    }

    await this.prisma.user.update({ where: { id }, data: rest });
    if (roleIds !== undefined) {
      await this.prisma.userHasRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await this.prisma.userHasRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }
    return this.findOne(id);
  }

  // ══════════════════════════════════════════════════════════════
  // TEAM CHANGE REQUESTS — Lead requests, Admin approves/rejects
  // ══════════════════════════════════════════════════════════════

  async submitTeamChangeRequest(data: {
    requestType: string; targetUserId: number; requestedBy: number;
    teamName?: string; managerName?: string; reason?: string;
  }) {
    let teamId: number | null = null;
    let managerId: number | null = null;

    if (data.teamName) {
      const team = await this.prisma.team.findFirst({ where: { teamName: { contains: data.teamName, mode: 'insensitive' } } });
      teamId = team?.id || null;
    }
    if (data.managerName) {
      const manager = await this.prisma.user.findFirst({
        where: { OR: [{ displayName: { contains: data.managerName, mode: 'insensitive' } }, { username: data.managerName }] },
      });
      managerId = manager?.id || null;
    }

    await this.prisma.$executeRaw`
      INSERT INTO team_change_requests (request_type, target_user_id, requested_by, team_id, manager_id, reason, status, created_at)
      VALUES (${data.requestType}, ${data.targetUserId}, ${data.requestedBy}, ${teamId}, ${managerId}, ${data.reason || null}, 0, NOW())`;

    return { requestCreated: true, message: 'Your request has been submitted for admin approval' };
  }

  async getTeamChangeRequests(status?: number) {
    const statusFilter = status !== undefined ? `AND tcr.status = ${status}` : '';
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT tcr.*,
             tu.display_name as "targetName", tu.username as "targetUsername",
             ru.display_name as "requesterName", ru.username as "requesterUsername",
             t.team_name as "teamName",
             mu.display_name as "managerName",
             rev.display_name as "reviewerName"
      FROM team_change_requests tcr
      JOIN users tu ON tu.id = tcr.target_user_id
      JOIN users ru ON ru.id = tcr.requested_by
      LEFT JOIN teams t ON t.id = tcr.team_id
      LEFT JOIN users mu ON mu.id = tcr.manager_id
      LEFT JOIN users rev ON rev.id = tcr.reviewed_by
      WHERE 1=1 ${statusFilter}
      ORDER BY tcr.created_at DESC`);
  }

  async approveTeamChangeRequest(id: number, reviewerId: number) {
    const reqs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM team_change_requests WHERE id = ${id} AND status = 0`;
    if (reqs.length === 0) return { error: 'Request not found or already processed' };
    const r = reqs[0];

    // Apply the change
    if (r.request_type === 'add_to_team' && r.team_id) {
      await this.addTeamMembership(r.target_user_id, r.team_id);
      // Also update primary team FK
      await this.prisma.user.update({ where: { id: r.target_user_id }, data: { teamId: r.team_id } });
      // Log history
      const team = await this.prisma.team.findUnique({ where: { id: r.team_id } });
      await this.prisma.$executeRaw`
        INSERT INTO employee_history (user_id, field_name, old_value, new_value, changed_by, effective_date, created_at)
        VALUES (${r.target_user_id}, 'team', '', ${team?.teamName || ''}, ${reviewerId}, CURRENT_DATE, NOW())`;
    } else if (r.request_type === 'remove_from_team' && r.team_id) {
      await this.prisma.$executeRaw`
        DELETE FROM user_team_memberships WHERE user_id = ${r.target_user_id} AND team_id = ${r.team_id}`;
    } else if (r.request_type === 'add_manager' && r.manager_id) {
      await this.addManager(r.target_user_id, r.manager_id);
      await this.prisma.user.update({ where: { id: r.target_user_id }, data: { reportTo: r.manager_id } });
      const mgr = await this.prisma.user.findUnique({ where: { id: r.manager_id } });
      await this.prisma.$executeRaw`
        INSERT INTO employee_history (user_id, field_name, old_value, new_value, changed_by, effective_date, created_at)
        VALUES (${r.target_user_id}, 'reportTo', '', ${mgr?.displayName || ''}, ${reviewerId}, CURRENT_DATE, NOW())`;
    } else if (r.request_type === 'remove_manager' && r.manager_id) {
      await this.prisma.$executeRaw`
        DELETE FROM user_managers WHERE user_id = ${r.target_user_id} AND manager_id = ${r.manager_id}`;
    }

    // Mark approved
    await this.prisma.$executeRaw`
      UPDATE team_change_requests SET status = 1, reviewed_by = ${reviewerId}, reviewed_at = NOW() WHERE id = ${id}`;

    // Audit log
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (user_id, action, target_id, details, created_at)
      VALUES (${reviewerId}, 'approve_team_change', ${r.target_user_id}, ${`Approved ${r.request_type} request #${id}`}, NOW())`;

    return { success: true };
  }

  async rejectTeamChangeRequest(id: number, reviewerId: number) {
    await this.prisma.$executeRaw`
      UPDATE team_change_requests SET status = 2, reviewed_by = ${reviewerId}, reviewed_at = NOW() WHERE id = ${id}`;
    return { success: true };
  }

  // Get full employee info with all teams and all managers
  async getEmployeeFullInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { team: true, designation: true, roles: { include: { role: true } } },
    });
    const teamsAndManagers = await this.getUserTeamsAndManagers(userId);
    return { ...user, allTeams: teamsAndManagers.teams, allManagers: teamsAndManagers.managers };
  }

  // Get reportee IDs for a manager (used across services)
  async getReporteeIds(managerId: number): Promise<number[]> {
    const rows = await this.prisma.$queryRaw<{ user_id: number }[]>`
      SELECT user_id FROM user_managers WHERE manager_id = ${managerId}`;
    return rows.map(r => r.user_id);
  }
}
