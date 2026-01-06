# Library Recommendation System

## 🎯 Project Overview

This project provides a **complete frontend starter** with mock data and comprehensive guides for students to implement the AWS serverless backend. Students will learn:

- Modern React development with TypeScript
- AWS Lambda, DynamoDB, API Gateway
- User authentication with Amazon Cognito
- AI integration with Amazon Bedrock
- Serverless architecture patterns
- Cloud deployment (S3 + CloudFront)

**Current Status**: ✅ Frontend complete | ✅ Backend & API integration | ✅ AI integration | ✅ Deployment

## 🌐 Live Application URL

- **Live Demo**: `https://main.d2z3ne709fyjqe.amplifyapp.com/`
- **Local Dev**: `http://localhost:5173`

## 🔌 API Endpoints

Base URL is configured via `VITE_API_BASE_URL` (see **Environment Variables** below). The frontend calls these routes (as implemented in `src/services/api.ts`):

### Public / App Routes

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| GET | `/books` | List books (may support pagination via `limit` + `nextToken`) | Optional |
| GET | `/books/:id` | Get one book by id | Optional |
| POST | `/books` | Create a new book | Required (admin) |
| PUT | `/books/:id` | Update a book | Required (admin) |
| DELETE | `/books/:id` | Delete a book | Required (admin) |
| POST | `/recommendations` | Get AI recommendations (body: `{ "query": "..." }`) | Required |
| GET | `/reading-lists` | List current user's reading lists | Required |
| GET | `/reading-lists/:id` | Get one reading list by id | Required |
| POST | `/reading-lists` | Create a reading list | Required |
| PUT | `/reading-lists/:id` | Update a reading list (name/description/bookIds/completedBookIds) | Required |
| DELETE | `/reading-lists/:id` | Delete a reading list | Required |
| GET | `/books/:bookId/reviews` | List reviews for a book | Optional/Required (depends on backend) |
| POST | `/books/:bookId/reviews` | Create a review (body: `{ "rating": number, "comment": string }`) | Required |
| DELETE | `/books/:bookId/reviews/:reviewId` | Delete own review (if backend supports ownership checks) | Required |

### Admin Routes

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| GET | `/admin/reviews` | List all reviews (supports `limit` + `nextToken`) | Required (admin) |
| DELETE | `/admin/books/:bookId/reviews/:reviewId` | Delete any review | Required (admin) |
| GET | `/admin/reading-lists` | List all reading lists | Required (admin) |
| GET | `/admin/users` | List users | Required (admin) |

## 📄 Swagger / OpenAPI

This repo includes a Swagger/OpenAPI specification that documents the API the frontend expects:

- `openapi.yaml`

### How to view it

- **Swagger Editor (recommended)**: open `openapi.yaml` in [Swagger Editor](https://editor.swagger.io/) and paste/upload the file.
- **Local preview (optional)**:

```bash
npx --yes @redocly/cli@latest preview
```

## 👥 Team Member Contributions

Fill this in before submitting:

---For Frontend Developments---

| Name | Responsibilities / Key Contributions |
| --- | --- |
| Kaan Erçelik | 15 commits. Work across `src/pages`, `src/components`, `src/services`, tests (`src/tests`), assets (`public/book-covers`). |

| Sertaç Bekir Erden| ~34 commits (combined). Major work across `src/pages`, `src/components`, `src/services`, `src/contexts`, `src/utils`, app wiring (`src/App.tsx`, `src/main.tsx`). |

| Yiğitcan Özdemir | ~8 commits (combined). Focus on `src/pages`, plus updates in `src/components`, `src/services`, `src/enums`, and `src/App.tsx`. |

| Sezer Can Akgüç | ~5 commits (combined). Updates in `src/pages`, `src/components`, `src/services`, styling (`src/index.css`), and environment/example config. |

---AWS Developments and Configurations---

| Name | Responsibilities / Key Contributions |
| --- | --- |
| Kaan Erçelik | IAM User and AWS Account Configurations. -- Books, Reading Lists, Admin Page's Lambda functions and API Gateway Configurations. --  DynamoDB Books and Reading List tables creation. -- Cognito User Pool creation and configuration.|

| Sertaç Bekir Erden | DynamoDB data insertion. -- Reviews and Recommendation Lambda and API Gateway Configurations. -- DynamoDB Reviews Table creation. -- S3 Bucket, CodePipeline, CodeBuild, AWS Amplify configurations and Deploying frontend CloudFront -- Amazon Nova Micro AI Integration on Amazon Bedrock |

| Yiğitcan Özdemir |   |

| Sezer Can Akgüç |  |

## 🚀 Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS
- **AI-Powered Recommendations**: Integration-ready for Amazon Bedrock
- **User Authentication**: Prepared for AWS Cognito integration
- **Reading Lists**: Organize and manage book collections
- **Admin Dashboard**: Book management and metrics
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript coverage
- **Testing**: Vitest + React Testing Library setup
- **Code Quality**: ESLint, Prettier, and strict TypeScript configuration

## 📋 Prerequisites

### For Frontend Development (Week 1)

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Git**: For version control

### For AWS Backend Implementation (Week 2-4)

- **AWS Account**: Free Tier eligible
- **AWS CLI**: Installed and configured
- **Basic AWS Knowledge**: Lambda, DynamoDB, API Gateway concepts

## 🚀 Quick Start Guide

### Step 1: Install Node.js (if not installed)

```bash
# Check if Node.js is installed
node --version

# Should show v20.x.x or higher
# If not installed, download from: https://nodejs.org/
```

### Step 2: Install Dependencies

```bash
cd library-recommendation-system
npm install
# This will take 2-3 minutes
```

### Step 2.5: Create `.env` (required for real AWS backend)

Create a file named `.env` in the project root:

```env
# API Gateway base URL (example)
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev

# AWS/Cognito (examples)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX

### Step 3: Start Development Server

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

### Step 4: Open in Browser

Open http://localhost:5173 in your browser.

You should see the Library Recommendation System homepage! 🎉

---




## 🛠️ Useful Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Check code quality
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🐛 Common First-Time Issues

### Port 5173 Already in Use

```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Or change the port in vite.config.ts
```

### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript
npm run build
```

### Styles Not Loading

1. Check that `src/index.css` exists
2. Restart dev server: `Ctrl+C` then `npm run dev`

---

## 📂 Project Structure

```
library-recommendation-system/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── common/       # UI elements (Button, Input, Upload, etc.)
│   │   ├── layout/       # Layout components (Header, Footer)
│   │   └── books/        # Book-specific components
│   ├── pages/            # Application routes (Home, Admin, Books, etc.)
│   ├── services/         # API integration
│   │   └── api.ts        # AWS API integration functions
│   ├── contexts/         # Global state management
│   ├── enums/            # Shared constants (Genres, Years)
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions (Formatting, Validation)
│   └── tests/            # Unit and component tests
├── public/               # Static assets
├── IMPLEMENTATION_GUIDE.md  # 📖 Step-by-step AWS guide
├── STUDENT_CHECKLIST.md     # ✅ Progress tracking
└── README.md                # This file
```

---

## 📜 Available Scripts

| Script                  | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm run dev`           | Start development server with hot reload |
| `npm run build`         | Build for production                     |
| `npm run preview`       | Preview production build locally         |
| `npm run lint`          | Run ESLint to check code quality         |
| `npm run format`        | Format code with Prettier                |
| `npm test`              | Run tests in watch mode                  |
| `npm run test:coverage` | Generate test coverage report            |

## 📁 Project Structure

```
frontend/
├── public/
│   └── book-covers/          # Book cover images
├── src/
│   ├── components/
│   │   ├── common/           # Reusable UI components
│   │   │   ├── AdvancedSelect.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ConfirmViewport.tsx
│   │   │   ├── CountUp.tsx
│   │   │   ├── CoverImageUpload.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ScrollToTop.tsx
│   │   │   ├── SearchableMultiSelect.tsx
│   │   │   └── ToastViewport.tsx
│   │   ├── layout/           # Layout components
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Navigation.tsx
│   │   └── books/            # Book-specific components
│   │       ├── BookCard.tsx
│   │       ├── BookGrid.tsx
│   │       └── BookSearch.tsx
│   ├── pages/                # Page components
│   │   ├── About.tsx
│   │   ├── Admin.tsx
│   │   ├── BookDetail.tsx
│   │   ├── Books.tsx
│   │   ├── ConfirmSignup.tsx
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── NotFound.tsx
│   │   ├── Privacy.tsx
│   │   ├── ReadingListDetail.tsx
│   │   ├── ReadingLists.tsx
│   │   ├── Recommendations.tsx
│   │   ├── Signup.tsx
│   │   └── Terms.tsx
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx
│   ├── enums/                # Enumerations
│   │   ├── genres.ts
│   │   └── years.ts
│   ├── hooks/                # Custom hooks
│   │   └── useAuth.ts
│   ├── services/             # API and data services
│   │   └── api.ts
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/                # Utility functions
│   │   ├── confirm.ts
│   │   ├── errorHandling.ts
│   │   ├── formatters.ts
│   │   ├── toast.ts
│   │   └── validation.ts
│   ├── tests/                # Test files
│   │   ├── components/
│   │   ├── utils/
│   │   └── setup.ts
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── .vscode/                  # VS Code settings
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```


## 🔧 Configuration Files

### TypeScript (`tsconfig.json`)

- Strict mode enabled
- Path aliases configured (`@/` → `src/`)
- React JSX support

### Vite (`vite.config.ts`)

- Path alias resolution
- Dev server on port 5173
- Optimized production builds
- Code splitting for vendor libraries

### Tailwind CSS (`tailwind.config.js`)

- Custom color palette (primary shades)
- Custom animations (fade-in, slide-up)
- Responsive breakpoints

### ESLint & Prettier

- React and TypeScript rules
- Automatic formatting on save
- Import sorting

## 🎨 UI Components

### Common Components

- **Button**: Variants (primary, secondary, danger), sizes (sm, md, lg)
- **Card**: Hoverable cards with shadow effects
- **Input**: Form inputs with validation and error display
- **Modal**: Accessible modal with backdrop and ESC key support
- **LoadingSpinner**: Animated loading indicator
- **ProtectedRoute**: Route wrapper for authentication

### Layout Components

- **Header**: Responsive navigation with mobile menu
- **Footer**: Copyright and social links
- **Navigation**: Active link styling with React Router

### Book Components

- **BookCard**: Book display with cover, title, author, rating
- **BookGrid**: Responsive grid layout for books
- **BookSearch**: Search and filter interface

## 🔐 Authentication

Authentication is fully implemented using **AWS Amazon Cognito** and **AWS Amplify**.

### Features

- **Secure Authentication**: User sign-up, sign-in, and sign-out functionality.
- **Session Management**: Persistent sessions with automatic token refresh.
- **Protected Routes**: Guards restricted pages (e.g., Reading Lists) using `ProtectedRoute`.
- **Context API**: `AuthContext` provides global user state throughout the application.

### Configuration

Ensure your `.env` file contains the correct Cognito credentials:

```env
VITE_API_BASE_URL= https://xxxxx.execute-api.us-east-1.amazonaws.com/dev 
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_REGION=us-east-1
```

### Environment Variables:

After deploying your backend, update `.env`:

```env
VITE_API_BASE_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/dev
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Generate Coverage Report

```bash
npm run test:coverage
```

### Test Structure

- Component tests in `src/tests/components/`
- Utility tests in `src/tests/utils/`
- Test setup in `src/tests/setup.ts`


### Cost Estimate:

- **S3 Storage**: Free (within 5GB Free Tier)
- **CloudFront**: Free (within 1TB transfer Free Tier)
- **Total**: $0/month for typical student project usage

## 🐛 Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# Kill the process using the port
lsof -ti:5173 | xargs kill -9

# Or change the port in vite.config.ts
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Rebuild TypeScript
npm run build
```

### Tailwind Styles Not Applying

1. Check that `index.css` imports Tailwind directives
2. Verify `tailwind.config.js` content paths
3. Restart dev server


### External Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [AWS Lambda Guide](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Guide](https://docs.aws.amazon.com/dynamodb/)
- [Cognito Guide](https://docs.aws.amazon.com/cognito/)
- [Bedrock Guide](https://docs.aws.amazon.com/bedrock/)

## 🤝 Contributing

This is a student project for CENG413 Software Quality Standards course. Follow the project guidelines and coding standards defined in `.kiro/steering/` files.

## 📄 License

This project is part of an academic course at Istanbul Okan University.

---
