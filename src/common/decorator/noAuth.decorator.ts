import { SetMetadata } from "@nestjs/common";

export const noAuth = () => SetMetadata('noAuth', true)