import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus, BadGatewayException, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map(data => ({
      code: HttpStatus.OK,
      data,
      msg: data.msg || 'success'
    }))).pipe(
      catchError(err =>
        throwError(() => new HttpException({
          code: err.status,
          error: err.response,
          msg: err.response
        }, err.status))
      )
    )
  }
}