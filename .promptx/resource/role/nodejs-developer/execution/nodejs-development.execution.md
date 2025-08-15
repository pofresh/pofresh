<execution>
  <constraint>
    ## Node.js开发客观限制
    - **Node.js版本约束**：支持LTS版本(16.x, 18.x, 20.x, 22.x)，不开发非稳定版本特性
    - **运行时环境**：Linux/macOS/Windows开发环境，Docker/Podman容器化部署
    - **依赖管理**：使用pnpm/yarn，避免npm install --save-dev的滥用
    - **测试环境**：支持Jest/Mocha/Chai/Vitest测试框架，覆盖率要求>80%
    - **部署环境**：支持PM2集群模式，Docker/Podman容器化，CI/CD流水线
  </constraint>
  
  <rule>
    ## Node.js开发强制性规则
    - **TypeScript强制**：所有新项目必须使用TypeScript，启用strict模式
    - **代码质量强制**：ESLint + Prettier必须配置，pre-commit检查必须启用
    - **错误处理强制**：必须实现统一的错误处理中间件，禁止console.error
    - **日志规范强制**：使用Winston结构化日志，必须包含请求ID和错误追踪
    - **安全防护强制**：所有输入必须验证，必须使用 helmet 等安全中间件
    - **性能监控强制**：必须集成APM工具，必须实现健康检查端点
    - **测试覆盖强制**：核心功能必须有单元测试，API必须有集成测试
    - **文档规范强制**：所有API必须有文档，所有复杂逻辑必须有注释
  </rule>
  
  <guideline>
    ## Node.js开发指导原则
    
    ### 项目结构设计
    ```
    src/
    ├── config/          # 配置文件
    ├── controllers/     # 控制器
    ├── services/        # 业务逻辑
    ├── models/          # 数据模型
    ├── middleware/      # 中间件
    ├── utils/           # 工具函数
    ├── types/           # TypeScript类型定义
    └── app.ts          # 应用入口
    
    test/
    ├── unit/           # 单元测试
    ├── integration/    # 集成测试
    └── e2e/            # 端到端测试
    ```
    
    ### 开发流程规范
    - **Git工作流**：采用GitHub Flow，feature分支开发，Pull Request审查
    - **代码审查**：必须至少2人审查，重点关注性能、安全、可维护性
    - **测试策略**：单元测试+集成测试+E2E测试，持续集成自动触发
    - **发布流程**：语义化版本控制，灰度发布，监控告警
    
    ### 技术栈选择指南
    - **Web框架**：Express.js(轻量级)、Koa.js(中间件优先)、NestJS(企业级)
    - **数据库**：PostgreSQL(关系型)、MongoDB(文档型)、Redis(缓存)
    - **ORM/ODM**：Prisma(类型安全)、TypeORM(企业级)、Mongoose(MongoDB)
    - **认证授权**：Passport.js、JWT、OAuth2.0
    - **API文档**：Swagger/OpenAPI、Swagger UI
    - **日志系统**：Winston、Bunyan、Pino
    - **监控工具**：Prometheus + Grafana、New Relic、Datadog
    
    ### 性能优化指南
    - **内存管理**：避免全局变量，及时释放事件监听器，使用WeakMap
    - **异步处理**：合理使用Promise.all，控制并发数量，避免回调地狱
    - **缓存策略**：Redis缓存、内存缓存、CDN加速
    - **连接池**：数据库连接池、HTTP连接复用、WebSocket连接管理
    - **代码分割**：动态导入、懒加载、按需加载
    
    ### 安全防护指南
    - **输入验证**：使用Joi/Yup进行数据验证，防止注入攻击
    - **依赖安全**：定期npm audit，使用npm audit fix修复漏洞
    - **访问控制**：JWT认证、RBAC权限控制、速率限制
    - **错误处理**：不暴露敏感信息，统一错误响应
    - **头部安全**：使用helmet设置安全HTTP头部
  </guideline>
  
  <process>
    ## Node.js开发标准流程
    
    ### Step 1: 项目初始化 (15分钟)
    ```bash
    # 创建项目结构
    mkdir my-nodejs-app
    cd my-nodejs-app
    
    # 初始化npm项目
    npm init -y
    
    # 安装核心依赖
    pnpm add express cors dotenv helmet morgan winston
    pnpm add -D typescript @types/node @types/express ts-node eslint prettier
    
    # 初始化TypeScript
    npx tsc --init
    ```
    
    ### Step 2: 基础配置 (30分钟)
    ```typescript
    // src/app.ts
    import express from 'express';
    import cors from 'cors';
    import helmet from 'helmet';
    import morgan from 'morgan';
    import { WinstonLogger } from './utils/logger';
    
    const app = express();
    
    // 中间件配置
    app.use(helmet());
    app.use(cors());
    app.use(morgan('combined'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // 错误处理中间件
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error(err.stack);
      res.status(500).json({ error: 'Internal Server Error' });
    });
    
    export default app;
    ```
    
    ### Step 3: 开发环境配置 (15分钟)
    ```json
    // .eslintrc.json
    {
      "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
      "parser": "@typescript-eslint/parser",
      "plugins": ["@typescript-eslint"],
      "rules": {
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-explicit-any": "warn"
      }
    }
    
    // .prettierrc
    {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5"
    }
    ```
    
    ### Step 4: 开发工作流配置 (15分钟)
    ```json
    // package.json
    {
      "scripts": {
        "dev": "nodemon src/app.ts",
        "build": "tsc",
        "start": "node dist/app.js",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "lint": "eslint src/**/*.ts",
        "lint:fix": "eslint src/**/*.ts --fix",
        "format": "prettier --write src/**/*.ts"
      },
      "husky": {
        "hooks": {
          "pre-commit": "lint-staged"
        }
      },
      "lint-staged": {
        "*.ts": ["eslint --fix", "prettier --write"]
      }
    }
    ```
    
    ### Step 5: 开发实践 (根据项目规模)
    
    #### API开发示例
    ```typescript
    // src/controllers/userController.ts
    import { Request, Response } from 'express';
    import { UserService } from '../services/userService';
    
    export class UserController {
      private userService: UserService;
      
      constructor() {
        this.userService = new UserService();
      }
      
      async getUsers(req: Request, res: Response): Promise<void> {
        try {
          const users = await this.userService.getAllUsers();
          res.json(users);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch users' });
        }
      }
    }
    ```
    
    #### 服务层示例
    ```typescript
    // src/services/userService.ts
    import { UserRepository } from '../repositories/userRepository';
    
    export class UserService {
      private userRepository: UserRepository;
      
      constructor() {
        this.userRepository = new UserRepository();
      }
      
      async getAllUsers() {
        return this.userRepository.findAll();
      }
    }
    ```
    
    #### 测试示例
    ```typescript
    // test/unit/userService.test.ts
    import { UserService } from '../../src/services/userService';
    import { UserRepository } from '../../src/repositories/userRepository';
    
    jest.mock('../../src/repositories/userRepository');
    
    describe('UserService', () => {
      let userService: UserService;
      let mockUserRepository: jest.Mocked<UserRepository>;
      
      beforeEach(() => {
        mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
        userService = new UserService();
        (userService as any).userRepository = mockUserRepository;
      });
      
      describe('getAllUsers', () => {
        it('should return all users', async () => {
          const users = [{ id: 1, name: 'John' }];
          mockUserRepository.findAll.mockResolvedValue(users);
          
          const result = await userService.getAllUsers();
          
          expect(result).toEqual(users);
        });
      });
    });
    ```
    
    ### Step 6: 部署配置 (30分钟)
    
    #### Docker配置
    ```dockerfile
    # Dockerfile
    FROM node:18-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --only=production
    COPY dist ./dist
    EXPOSE 3000
    CMD ["npm", "start"]
    ```
    
    #### PM2配置
    ```json
    // ecosystem.config.js
    {
      "apps": [{
        "name": "my-nodejs-app",
        "script": "dist/app.js",
        "instances": "max",
        "exec_mode": "cluster",
        "env": {
          "NODE_ENV": "production",
          "PORT": 3000
        }
      }]
    }
    ```
    
    ### Step 7: 监控配置 (30分钟)
    
    #### Winston日志配置
    ```typescript
    // src/utils/logger.ts
    import winston from 'winston';
    
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
    
    if (process.env.NODE_ENV !== 'production') {
      logger.add(new winston.transports.Console({
        format: winston.format.simple()
      }));
    }
    
    export { logger };
    ```
  </process>
  
  <criteria>
    ## Node.js开发质量标准
    
    ### 代码质量标准
    - ✅ **ESLint规则**：Airbnb标准配置，零错误警告
    - ✅ **TypeScript严格性**：启用所有严格类型检查，零any类型
    - ✅ **代码覆盖率**：单元测试覆盖率 > 80%，集成测试覆盖率 > 60%
    - ✅ **代码复杂度**：函数圈复杂度 < 10，代码行数 < 50行/函数
    
    ### 性能标准
    - ✅ **启动时间**：开发环境 < 3秒，生产环境 < 5秒
    - ✅ **内存使用**：单进程内存 < 500MB，内存泄漏率 < 1%/小时
    - ✅ **响应时间**：API平均响应时间 < 100ms，P99 < 500ms
    - ✅ **并发处理**：支持 > 1000并发连接，错误率 < 0.1%
    
    ### 安全标准
    - ✅ **依赖安全**：零高危漏洞，所有依赖经过安全扫描
    - ✅ **输入验证**：所有输入参数经过验证，防止注入攻击
    - ✅ **访问控制**：API访问权限控制，速率限制保护
    - ✅ **错误处理**：不暴露敏感信息，统一错误响应格式
    
    ### 可维护性标准
    - ✅ **模块化设计**：单一职责原则，低耦合高内聚
    - ✅ **接口设计**：RESTful API设计，一致的响应格式
    - ✅ **文档完整性**：API文档、架构文档、部署文档齐全
    - ✅ **测试覆盖**：核心功能100%单元测试，关键流程集成测试
    
    ### 部署标准
    - ✅ **容器化**：Docker容器化部署，镜像大小 < 500MB
    - ✅ **CI/CD**：自动化测试、构建、部署流程
    - ✅ **监控告警**：完整的监控体系，实时告警机制
    - ✅ **回滚机制**：快速回滚能力，发布成功率 > 99%
    
    ### 用户体验标准
    - ✅ **错误提示**：友好的错误信息，用户可理解的错误码
    - ✅ **响应格式**：统一的JSON响应格式，包含请求ID
    - ✅ **性能监控**：前端性能监控，用户体验指标追踪
    - ✅ **可用性**：系统可用性 > 99.9%，故障恢复时间 < 5分钟
  </criteria>
</execution>