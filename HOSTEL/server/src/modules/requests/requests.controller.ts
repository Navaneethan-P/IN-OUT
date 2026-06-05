import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/auth.types';
import { sendSuccess, sendCreated } from '../../utils/response';
import * as requestsService from './requests.service';

export async function createRequestHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = requestsService.createRequestSchema.parse(req.body);
    const request = await requestsService.createRequest(req.user!.id, input);
    sendCreated(res, request, 'Request submitted successfully');
  } catch (err) {
    next(err);
  }
}

export async function getMyRequestsHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '10'), 10);
    const result = await requestsService.getStudentRequests(
      req.user!.id,
      page,
      limit
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getRequestDetailHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const request = await requestsService.getRequestDetail(
      req.params.id as string,
      req.user!.id
    );
    sendSuccess(res, request);
  } catch (err) {
    next(err);
  }
}

export async function getTicketHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ticket = await requestsService.getTicket(req.params.id as string, req.user!.id);
    sendSuccess(res, ticket);
  } catch (err) {
    next(err);
  }
}

export async function cancelRequestHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await requestsService.cancelRequest(
      req.params.id as string,
      req.user!.id
    );
    sendSuccess(res, result, 'Request cancelled');
  } catch (err) {
    next(err);
  }
}
