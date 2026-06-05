import { Response, NextFunction } from 'express';
import db from '../../config/db';
import { AuthRequest } from '../../types/auth.types';
import { sendSuccess } from '../../utils/response';
import * as wardenService from './warden.service';
import * as exportService from './export.service';

// GET /warden/requests
export async function getRequestsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await wardenService.getAllRequests({
      status: req.query.status as string | undefined,
      department: req.query.department as string | undefined,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

// GET /warden/requests/:id
export async function getRequestDetailHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await wardenService.getRequestDetail(req.params.id as string);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

// PATCH /warden/requests/:id/approve
export async function approveRequestHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { note } = wardenService.approveSchema.parse(req.body);
    const result = await wardenService.approveRequest(
      req.params.id as string,
      req.user!.id,
      note
    );
    sendSuccess(res, result, 'Request approved. Initiate parent verification.');
  } catch (err) {
    next(err);
  }
}

// PATCH /warden/requests/:id/reject
export async function rejectRequestHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { reason } = wardenService.rejectSchema.parse(req.body);
    const result = await wardenService.rejectRequest(
      req.params.id as string,
      req.user!.id,
      reason
    );
    sendSuccess(res, result, 'Request rejected');
  } catch (err) {
    next(err);
  }
}

// POST /warden/requests/:id/parent-verify
export async function parentVerifyHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = wardenService.parentVerifySchema.parse(req.body);
    const result = await wardenService.recordParentVerification(
      req.params.id as string,
      req.user!.id,
      input
    );
    sendSuccess(res, result, 'Parent verification recorded');
  } catch (err) {
    next(err);
  }
}

// GET /warden/presence
export async function getPresenceHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await wardenService.getPresenceStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

// GET /warden/students
export async function getStudentsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await wardenService.getStudentList({
      search: req.query.search as string | undefined,
      department: req.query.department as string | undefined,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 30,
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

// POST /warden/students/:id/toggle-presence
export async function togglePresenceHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await wardenService.toggleStudentPresence(
      req.params.id as string,
      req.user!.id
    );
    sendSuccess(res, result, 'Student presence updated');
  } catch (err) {
    next(err);
  }
}

// GET /warden/settings
export async function getSettingsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await wardenService.getSettings();
    const warden = await db.user.findUnique({ where: { id: req.user!.id } });
    sendSuccess(res, { settings, googleEmail: warden?.googleEmail || null }, 'System settings retrieved');
  } catch (err) {
    next(err);
  }
}

// PATCH /warden/settings
export async function updateSettingsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = wardenService.updateSettingsSchema.parse(req.body);
    const settings = await wardenService.updateSettings(req.user!.id, data);
    sendSuccess(res, settings, 'Settings updated');
  } catch (err) {
    next(err);
  }
}

// ── Export Handlers ────────────────────────────────────────────────────────────

function sendCSV(res: Response, csv: string, filename: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  // BOM for Excel UTF-8 compatibility
  res.send('\uFEFF' + csv);
}

// GET /warden/export/requests
export async function exportRequestsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { csv, filename } = await exportService.exportRequests({
      status: req.query.status as string | undefined,
      department: req.query.department as string | undefined,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    });
    sendCSV(res, csv, filename);
  } catch (err) {
    next(err);
  }
}

// GET /warden/export/students
export async function exportStudentsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { csv, filename } = await exportService.exportStudents({
      department: req.query.department as string | undefined,
      year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
    });
    sendCSV(res, csv, filename);
  } catch (err) {
    next(err);
  }
}

// GET /warden/export/overdue
export async function exportOverdueHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { csv, filename } = await exportService.exportOverdueReport();
    sendCSV(res, csv, filename);
  } catch (err) {
    next(err);
  }
}

// GET /warden/export/audit
export async function exportAuditHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { csv, filename } = await exportService.exportAuditTrail({
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
    });
    sendCSV(res, csv, filename);
  } catch (err) {
    next(err);
  }
}
