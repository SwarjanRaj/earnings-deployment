import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Verification code must be 6 digits',
  })
  code: string;

  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])/, { message: 'Must include uppercase' })
  @Matches(/(?=.*[a-z])/, { message: 'Must include lowercase' })
  @Matches(/(?=.*\d)/,    { message: 'Must include a digit' })
  @Matches(/(?=.*[@$!%*?&])/, { message: 'Must include a special char' })
  newPassword: string;

  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword: string;
}
