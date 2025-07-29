import { Router, Request, Response } from 'express';
import { UserService } from '../../services/user';
import { authMiddleware } from '../../auth/jwt';
import { validateRequest } from '../../middleware/validation';;
import { 
  RegisterDto, 
  LoginDto, 
  UpdateProfileDto 
} from '../../types/auth';
import { ChangePasswordDto } from '../../types/user';
import { changePasswordValidation, loginValidation, registerValidation, updateProfileValidation } from '../../validations/auth';

const router = Router();
const userService = new UserService();


// Register endpoint
router.post('/register', registerValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const userData: RegisterDto = req.body;
    const result = await userService.register(userData);
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const loginData: LoginDto = req.body;
    const result = await userService.login(loginData);
    
    if (result.success && result.data) {
      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }
    
    res.status(result.success ? 200 : 401).json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        user: result.data?.user,
        accessToken: result.data?.accessToken
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        data: null
      });
      return;
    }
    
    const result = await userService.refreshToken(refreshToken);
    
    if (result.success && result.data) {
      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }
    
    res.status(result.success ? 200 : 401).json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        accessToken: result.data?.accessToken
      } : null
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const userId = (req as any).user.id;
    
    if (refreshToken) {
      await userService.logout(userId, refreshToken);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Logout from all devices endpoint
router.post('/logout-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await userService.logoutAllDevices(userId);
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Get current user profile
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await userService.getUserById(userId);
    
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Update current user profile
router.put('/me', authMiddleware, updateProfileValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updateData: UpdateProfileDto = req.body;
    
    const result = await userService.updateProfile(userId, updateData);
    
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Change password
router.put('/change-password', authMiddleware, changePasswordValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const passwordData: ChangePasswordDto = req.body;
    
    const result = await userService.changePassword(userId, passwordData);
    
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

// Verify token endpoint
router.get('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: user.id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});

export default router;