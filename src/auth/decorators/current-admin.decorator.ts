import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export interface AuthenticatedAdmin {
  id: number;
  email: string;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedAdmin;
  },
);
