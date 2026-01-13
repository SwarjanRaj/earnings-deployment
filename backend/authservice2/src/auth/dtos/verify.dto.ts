import { IsEmail, IsString, Matches } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Verification code must be 6 digits',
  })
  code: string;
}
