import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Username must not be empty' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can contain letters, numbers, and underscores only',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Password must contain at least one digit',
  })
  @Matches(/(?=.*[@$!%*?&])/, {
    message: 'Password must contain at least one special character (@$!%*?&)',
  })
  password: string;

  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @Matches(
    /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/,
    { message: 'Date of Birth must be in MM/DD/YYYY format' },
  )
  dob: string;
}
