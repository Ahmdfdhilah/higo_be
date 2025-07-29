import { 
  emailValidation,
  passwordValidation,
  firstNameValidation,
  lastNameValidation,
  roleValidation,
  optionalEmailValidation,
  optionalFirstNameValidation,
  optionalLastNameValidation,
  currentPasswordValidation,
  newPasswordValidation,
  simplePasswordValidation
} from './base';

// Register validation
export const registerValidation = [
  emailValidation,
  passwordValidation,
  firstNameValidation,
  lastNameValidation,
  roleValidation
];

// Login validation
export const loginValidation = [
  emailValidation,
  simplePasswordValidation
];

// Change password validation
export const changePasswordValidation = [
  currentPasswordValidation,
  newPasswordValidation
];

// Update profile validation (for authenticated user)
export const updateProfileValidation = [
  optionalFirstNameValidation,
  optionalLastNameValidation,
  optionalEmailValidation
];