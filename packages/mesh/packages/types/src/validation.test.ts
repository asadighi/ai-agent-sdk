import { describe, test, expect } from 'vitest';
import { 
    AgentType,
    AgentStatus,
    ManagerRole,
    MessageType,
    OperationType,
    AuthStatus,
    MeshStatus
} from './index';

import { 
    isValidAgentConfig,
    isValidAgentState,
    isValidBaseMessage,
    isValidOperation,
    isValidAuthContext,
    isValidAuthResult,
    isValidElectionConfig,
    isValidElectionState,
    isAgentType,
    isAgentStatus,
    isManagerRole,
    isMessageType,
    isOperationType,
    isAuthStatus,
    isMeshStatus
} from './validation';

describe('Validation Utilities', () => {
    describe('Type Guards', () => {
        test('isAgentType', () => {
            expect(isAgentType(AgentType.WORKER)).toBe(true);
            expect(isAgentType(AgentType.MANAGER)).toBe(true);
            expect(isAgentType('INVALID')).toBe(false);
            expect(isAgentType(null)).toBe(false);
            expect(isAgentType(undefined)).toBe(false);
        });

        test('isAgentStatus', () => {
            expect(isAgentStatus(AgentStatus.ONLINE)).toBe(true);
            expect(isAgentStatus(AgentStatus.OFFLINE)).toBe(true);
            expect(isAgentStatus('INVALID')).toBe(false);
            expect(isAgentStatus(null)).toBe(false);
            expect(isAgentStatus(undefined)).toBe(false);
        });

        test('isManagerRole', () => {
            expect(isManagerRole(ManagerRole.LEADER)).toBe(true);
            expect(isManagerRole(ManagerRole.FOLLOWER)).toBe(true);
            expect(isManagerRole('INVALID')).toBe(false);
            expect(isManagerRole(null)).toBe(false);
            expect(isManagerRole(undefined)).toBe(false);
        });

        test('isMessageType', () => {
            expect(isMessageType(MessageType.HEARTBEAT)).toBe(true);
            expect(isMessageType(MessageType.STATE_UPDATE)).toBe(true);
            expect(isMessageType('INVALID')).toBe(false);
            expect(isMessageType(null)).toBe(false);
            expect(isMessageType(undefined)).toBe(false);
        });

        test('isOperationType', () => {
            expect(isOperationType(OperationType.READ)).toBe(true);
            expect(isOperationType(OperationType.WRITE)).toBe(true);
            expect(isOperationType('INVALID')).toBe(false);
            expect(isOperationType(null)).toBe(false);
            expect(isOperationType(undefined)).toBe(false);
        });

        test('isAuthStatus', () => {
            expect(isAuthStatus(AuthStatus.SUCCESS)).toBe(true);
            expect(isAuthStatus(AuthStatus.FAILURE)).toBe(true);
            expect(isAuthStatus('INVALID')).toBe(false);
            expect(isAuthStatus(null)).toBe(false);
            expect(isAuthStatus(undefined)).toBe(false);
        });

        test('isMeshStatus', () => {
            expect(isMeshStatus(MeshStatus.ACTIVE)).toBe(true);
            expect(isMeshStatus(MeshStatus.INACTIVE)).toBe(true);
            expect(isMeshStatus('INVALID')).toBe(false);
            expect(isMeshStatus(null)).toBe(false);
            expect(isMeshStatus(undefined)).toBe(false);
        });
    });

    describe('Complex Type Validation', () => {
        test('isValidAgentConfig', () => {
            const validConfig = {
                id: 'test-agent',
                type: AgentType.WORKER,
                name: 'Test Agent',
                capabilities: ['test'],
                metadata: {}
            };

            expect(isValidAgentConfig(validConfig)).toBe(true);
            expect(isValidAgentConfig({ ...validConfig, type: 'INVALID' })).toBe(false);
            expect(isValidAgentConfig({ ...validConfig, id: 123 })).toBe(false);
            expect(isValidAgentConfig(null)).toBe(false);
            expect(isValidAgentConfig(undefined)).toBe(false);
        });

        test('isValidAgentState', () => {
            const validState = {
                id: 'test-agent',
                version: 1,
                data: {},
                lastUpdated: new Date()
            };

            expect(isValidAgentState(validState)).toBe(true);
            expect(isValidAgentState({ ...validState, version: '1' })).toBe(false);
            expect(isValidAgentState({ ...validState, data: null })).toBe(false);
            expect(isValidAgentState(null)).toBe(false);
            expect(isValidAgentState(undefined)).toBe(false);
        });

        test('isValidBaseMessage', () => {
            const validMessage = {
                id: 'test-message',
                type: MessageType.HEARTBEAT,
                senderId: 'sender',
                recipientId: 'recipient',
                timestamp: new Date(),
                metadata: {}
            };

            expect(isValidBaseMessage(validMessage)).toBe(true);
            expect(isValidBaseMessage({ ...validMessage, type: 'INVALID' })).toBe(false);
            expect(isValidBaseMessage({ ...validMessage, timestamp: 'invalid' })).toBe(false);
            expect(isValidBaseMessage(null)).toBe(false);
            expect(isValidBaseMessage(undefined)).toBe(false);
        });

        test('isValidOperation', () => {
            const validOperation = {
                type: OperationType.READ,
                resource: 'test-resource',
                timestamp: new Date(),
                parameters: {}
            };

            expect(isValidOperation(validOperation)).toBe(true);
            expect(isValidOperation({ ...validOperation, type: 'INVALID' })).toBe(false);
            expect(isValidOperation({ ...validOperation, resource: 123 })).toBe(false);
            expect(isValidOperation(null)).toBe(false);
            expect(isValidOperation(undefined)).toBe(false);
        });

        test('isValidAuthContext', () => {
            const validContext = {
                agentId: 'test-agent',
                agentType: AgentType.WORKER,
                capabilities: ['test'],
                role: ManagerRole.LEADER,
                metadata: {}
            };

            expect(isValidAuthContext(validContext)).toBe(true);
            expect(isValidAuthContext({ ...validContext, agentType: 'INVALID' })).toBe(false);
            expect(isValidAuthContext({ ...validContext, capabilities: 'invalid' })).toBe(false);
            expect(isValidAuthContext(null)).toBe(false);
            expect(isValidAuthContext(undefined)).toBe(false);
        });

        test('isValidAuthResult', () => {
            const validResult = {
                status: AuthStatus.SUCCESS,
                token: 'test-token',
                error: 'test-error',
                expiresAt: new Date()
            };

            expect(isValidAuthResult(validResult)).toBe(true);
            expect(isValidAuthResult({ ...validResult, status: 'INVALID' })).toBe(false);
            expect(isValidAuthResult({ ...validResult, token: 123 })).toBe(false);
            expect(isValidAuthResult(null)).toBe(false);
            expect(isValidAuthResult(undefined)).toBe(false);
        });

        test('isValidElectionConfig', () => {
            const validConfig = {
                electionTimeout: 5000,
                heartbeatTimeout: 1000,
                minElectionTimeout: 3000,
                maxElectionTimeout: 10000
            };

            expect(isValidElectionConfig(validConfig)).toBe(true);
            expect(isValidElectionConfig({ ...validConfig, electionTimeout: -1 })).toBe(false);
            expect(isValidElectionConfig({ ...validConfig, maxElectionTimeout: 1000 })).toBe(false);
            expect(isValidElectionConfig(null)).toBe(false);
            expect(isValidElectionConfig(undefined)).toBe(false);
        });

        test('isValidElectionState', () => {
            const validState = {
                currentTerm: 1,
                votedFor: 'test-candidate',
                leaderId: 'test-leader',
                isCandidate: true,
                lastHeartbeatTime: new Date(),
                lastElectionTime: new Date()
            };

            expect(isValidElectionState(validState)).toBe(true);
            expect(isValidElectionState({ ...validState, currentTerm: -1 })).toBe(false);
            expect(isValidElectionState({ ...validState, lastHeartbeatTime: 'invalid' })).toBe(false);
            expect(isValidElectionState(null)).toBe(false);
            expect(isValidElectionState(undefined)).toBe(false);
        });
    });
}); 