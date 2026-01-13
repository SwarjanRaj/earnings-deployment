"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomToken = void 0;
const crypto = require("crypto");
const randomToken = () => crypto.randomBytes(32).toString('base64url');
exports.randomToken = randomToken;
//# sourceMappingURL=random-token.js.map