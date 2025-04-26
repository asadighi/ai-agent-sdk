# Monorepo Package Management Guide

## Package Structure

### Types Package
- Keep interfaces and type definitions in the types package
- Avoid implementation-specific dependencies in the types package
- Design interfaces to be implementation-agnostic when possible
- Use minimal types that capture only the essential properties needed

### Implementation Packages
- Import types from the types package
- Keep implementation-specific dependencies in their respective packages
- Use workspace dependencies for internal packages
- Maintain consistent versioning across related packages

## Dependency Management

### Firebase Dependencies
- Use `@firebase/{package}` instead of `firebase/{package}`
- Keep Firebase dependencies in implementation packages only
- Use consistent versions across Firebase-related packages
- Example:
  ```json
  {
    "dependencies": {
      "@firebase/firestore": "^4.0.0",
      "@firebase/app": "^0.10.0"
    }
  }
  ```

### Testing Dependencies
- Use Vitest for testing
- Configure test scripts to use `vitest run`
- Properly type mock functions using `ReturnType<typeof vi.fn>`
- Example:
  ```typescript
  let mockOperations: IDatabaseOperations & {
    setupConnectionListener: ReturnType<typeof vi.fn>;
    getConnectionStatusRef: ReturnType<typeof vi.fn>;
  };
  ```

## Interface Design

### Best Practices
- Keep interfaces in the types package
- Design interfaces to be implementation-agnostic
- Use minimal types that capture only essential properties
- Provide mapping functions for implementation-specific types
- Example:
  ```typescript
  interface IDatabaseOperations {
    setupConnectionListener(
      onNext: (snapshot: IDocumentSnapshot) => void,
      onError: (error: IDatabaseError) => void
    ): () => void;
  }
  ```

### Mocking
- Extend interfaces with mock function types
- Use proper typing for mock implementations
- Example:
  ```typescript
  mockOperations = {
    setupConnectionListener: vi.fn().mockImplementation((
      onNext: (snapshot: IDocumentSnapshot) => void,
      onError: (error: IDatabaseError) => void
    ) => {
      return mockUnsubscribe;
    })
  };
  ```

## Version Management

### Package Versions
- Use consistent versioning across related packages
- Use workspace dependencies for internal packages
- Example:
  ```json
  {
    "dependencies": {
      "@ai-agent/connectivity/types": "workspace:*"
    }
  }
  ```

### Dependency Updates
- Update related packages together
- Test changes across all affected packages
- Maintain backward compatibility when possible

## Testing Guidelines

### Test Structure
- Keep tests in a `__tests__` directory
- Use descriptive test names
- Group related tests using `describe` blocks
- Example:
  ```typescript
  describe('FirebaseConnectionStatus', () => {
    describe('connection state', () => {
      it('should update state when connection is restored', () => {
        // test implementation
      });
    });
  });
  ```

### Mocking Guidelines
- Use Vitest's mocking capabilities
- Properly type mock functions
- Keep mock implementations simple and focused
- Example:
  ```typescript
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };
  ``` 