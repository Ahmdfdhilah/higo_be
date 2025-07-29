// MongoDB initialization script
db = db.getSiblingDB('higoapp');

// Create application user
db.createUser({
  user: 'higouser',
  pwd: 'higopassword',
  roles: [
    {
      role: 'readWrite',
      db: 'higoapp'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        password: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        firstName: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        lastName: {
          bsonType: 'string',
          description: 'must be a string and is required'
        },
        role: {
          enum: ['admin', 'user', 'moderator'],
          description: 'must be one of the enum values'
        },
        status: {
          enum: ['active', 'inactive', 'suspended'],
          description: 'must be one of the enum values'
        }
      }
    }
  }
});

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ status: 1, role: 1 });
db.users.createIndex({ createdAt: -1 });

// Insert default admin user (password will be hashed by the application)
db.users.insertOne({
  email: 'admin@higo.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/CqZjU8jOjqOjONGmG', // password: 'admin123'
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  status: 'active',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: []
});

print('Database initialized successfully');
print('Default admin user created: admin@higo.com / admin123');