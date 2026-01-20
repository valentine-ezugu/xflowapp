import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { KycStatusResponse } from '@/types/auth';

interface KycProgressCardProps {
  kycStatus: KycStatusResponse;
  onDismiss?: () => void;
}

export function KycProgressCard({ kycStatus, onDismiss }: KycProgressCardProps) {
  // Don't show if fully verified
  if (kycStatus.kycTier === 'LEVEL1') {
    return null;
  }

  const steps = [
    {
      key: 'PROFILE',
      title: 'Profile created',
      subtitle: 'Boom! You\'re in.',
      route: '/(onboarding)/personal-info',
    },
    {
      key: 'ADDRESS',
      title: 'Continue verification',
      subtitle: 'Unlock all account features.',
      route: '/(onboarding)/address',
    },
    {
      key: 'VERIFICATION',
      title: 'Activate portfolio',
      subtitle: 'Verify your identity.',
      route: '/(onboarding)/verify-identity',
    },
  ];

  const getStepStatus = (stepKey: string) => {
    const step = kycStatus.steps.find(s => s.step === stepKey);
    return step?.complete || false;
  };

  const getCurrentStepIndex = () => {
    for (let i = 0; i < steps.length; i++) {
      if (!getStepStatus(steps[i].key)) {
        return i;
      }
    }
    return steps.length;
  };

  const currentStepIndex = getCurrentStepIndex();
  const completedSteps = steps.filter((_, i) => i < currentStepIndex).length;
  const progress = (completedSteps / steps.length) * 100;

  const handleStepPress = (index: number) => {
    if (index <= currentStepIndex) {
      router.push(steps[Math.min(index, currentStepIndex)].route as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Get ready to trade</Text>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isLocked = index > currentStepIndex;

          return (
            <TouchableOpacity
              key={step.key}
              style={styles.stepItem}
              onPress={() => handleStepPress(index)}
              disabled={isLocked}
            >
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepNumber,
                  isCompleted && styles.stepNumberCompleted,
                  isCurrent && styles.stepNumberCurrent,
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text style={[
                      styles.stepNumberText,
                      isCurrent && styles.stepNumberTextCurrent,
                    ]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepTitle,
                    isCompleted && styles.stepTitleCompleted,
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
              {!isCompleted && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isLocked ? '#444' : '#666'}
                />
              )}
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 2,
  },
  steps: {
    gap: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberCompleted: {
    backgroundColor: '#00D4AA',
  },
  stepNumberCurrent: {
    backgroundColor: '#6C5CE7',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberTextCurrent: {
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  stepTitleCompleted: {
    color: '#888',
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  completedBadge: {
    marginLeft: 8,
  },
});
