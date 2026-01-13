"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupDto = void 0;
const class_validator_1 = require("class-validator");
const match_decorator_1 = require("../../common/decorators/match.decorator");
class SignupDto {
    email;
    username;
    password;
    confirmPassword;
    dob;
}
exports.SignupDto = SignupDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SignupDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Username must not be empty' }),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can contain letters, numbers, and underscores only',
    }),
    __metadata("design:type", String)
], SignupDto.prototype, "username", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: 'Password must be at least 8 characters long' }),
    (0, class_validator_1.Matches)(/(?=.*[A-Z])/, {
        message: 'Password must contain at least one uppercase letter',
    }),
    (0, class_validator_1.Matches)(/(?=.*[a-z])/, {
        message: 'Password must contain at least one lowercase letter',
    }),
    (0, class_validator_1.Matches)(/(?=.*\d)/, {
        message: 'Password must contain at least one digit',
    }),
    (0, class_validator_1.Matches)(/(?=.*[@$!%*?&])/, {
        message: 'Password must contain at least one special character (@$!%*?&)',
    }),
    __metadata("design:type", String)
], SignupDto.prototype, "password", void 0);
__decorate([
    (0, match_decorator_1.Match)('password', { message: 'Passwords do not match' }),
    __metadata("design:type", String)
], SignupDto.prototype, "confirmPassword", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/, { message: 'Date of Birth must be in MM/DD/YYYY format' }),
    __metadata("design:type", String)
], SignupDto.prototype, "dob", void 0);
//# sourceMappingURL=signup.dto.js.map