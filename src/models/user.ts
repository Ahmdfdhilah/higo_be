import { Schema, model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IBaseModel, baseSchema } from './base';
import { UserStatus, UserRole } from './enums';

export interface IUser extends IBaseModel {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  refreshTokens: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateRefreshToken(): string;
  addRefreshToken(token: string): Promise<void>;
  removeRefreshToken(token: string): Promise<void>;
  clearAllRefreshTokens(): Promise<void>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
    index: true
  },
  lastLoginAt: {
    type: Date
  },
  emailVerifiedAt: {
    type: Date
  },
  refreshTokens: [{
    type: String
  }],
  ...baseSchema
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      return ret;
    }
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateRefreshToken = function(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

userSchema.methods.addRefreshToken = async function(token: string): Promise<void> {
  this.refreshTokens.push(token);
  await this.save();
};

userSchema.methods.removeRefreshToken = async function(token: string): Promise<void> {
  this.refreshTokens = this.refreshTokens.filter(t => t !== token);
  await this.save();
};

userSchema.methods.clearAllRefreshTokens = async function(): Promise<void> {
  this.refreshTokens = [];
  await this.save();
};

userSchema.index({ email: 1 });
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1 });

export const User = model<IUser>('User', userSchema);