# Verification Components

This directory contains reusable components for the verification system.

## Components

### Core Components

- **`VerifyStatus.tsx`** - Main component that handles verification status display and logic
- **`VerifyButton.tsx`** - Button component for starting verification process
- **`AdminVerificationPanel.tsx`** - Admin panel for managing verifications

### Reusable UI Components

- **`VerificationStep.tsx`** - Individual verification step with completion status
- **`VerificationCard.tsx`** - Card container for verification content
- **`VerificationSteps.tsx`** - Complete list of verification steps
- **`VerificationStatusContent.tsx`** - Content renderer based on verification status

## Usage

```tsx
import { VerifyStatus } from "./components";

// Basic usage
<VerifyStatus enabled={true} />;

// Import individual components if needed
import { VerificationStep, VerificationCard } from "./components";
```

## Benefits of Refactoring

1. **Reusability**: Components can be used across different verification states
2. **Maintainability**: Easier to update verification steps or styling
3. **Performance**: Better separation of concerns and optimized re-renders
4. **Type Safety**: Proper TypeScript interfaces for all components
5. **Consistency**: Unified styling and behavior across verification states

## Component Hierarchy

```
VerifyStatus
└── VerificationStatusContent
    ├── VerificationCard
    │   └── VerificationSteps
    │       └── VerificationStep (multiple)
    └── VerifyButton (when applicable)
```

## Props

### VerifyStatus

- `enabled: boolean` - Whether verification is enabled

### VerificationStep

- `title: string` - Step title
- `description: string` - Step description
- `isCompleted?: boolean` - Whether step is completed
- `isLast?: boolean` - Whether this is the last step

### VerificationCard

- `title: string` - Card title
- `children: ReactNode` - Card content
- `className?: string` - Additional CSS classes

### VerificationSteps

- `isCompleted?: boolean` - Whether all steps are completed
