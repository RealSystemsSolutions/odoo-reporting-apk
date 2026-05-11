import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Text from '@/components/ui/Text';
import type { CrmStageData, CrmLeadOpportunity } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  stages: CrmStageData[];
  totalRevenue: number;
}

export default function CrmPipelineFunnelChart({ stages, totalRevenue }: Props) {
  const { width, contentPadding } = useResponsive();
  const { colors } = useTheme();
  const [selectedStage, setSelectedStage] = useState<CrmStageData | null>(null);

  const chartWidth = width - contentPadding * 2 - 32;
  const maxWidth = chartWidth;
  const minWidth = 60;

  // Calculate funnel heights proportionally
  const maxRevenue = Math.max(...stages.map((s) => s.totalExpectedRevenue), 1);

  const colors_palette = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
  ];

  if (!stages || stages.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            minHeight: 200,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          CRM Conversion Funnel
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          No data available
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            CRM Conversion Funnel
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            ${(totalRevenue / 1000).toFixed(1)}k expected
          </Text>
        </View>

        {/* Funnel visualization */}
        <View style={styles.funnelContainer}>
          {stages.map((stage, index) => {
            const widthPercent =
              maxRevenue > 0
                ? (stage.totalExpectedRevenue / maxRevenue) * 100
                : 100;
            const stageWidth =
              (widthPercent / 100) * (maxWidth - minWidth) + minWidth;
            const stageColor = colors_palette[index % colors_palette.length];

            return (
              <TouchableOpacity
                key={stage.stageId}
                onPress={() => setSelectedStage(stage)}
                activeOpacity={0.7}
              >
                <View style={styles.funnelSegmentWrapper}>
                  <View
                    style={[
                      styles.funnelSegment,
                      {
                        width: stageWidth,
                        backgroundColor: stageColor,
                        opacity: 0.85,
                      },
                    ]}
                  >
                    <View style={styles.segmentContent}>
                      <Text style={styles.segmentLabel}>
                        {stage.stageName}
                      </Text>
                      <Text style={styles.segmentCount}>
                        {stage.totalOpportunities} opportunities
                      </Text>
                      <Text style={styles.segmentRevenue}>
                        ${(stage.totalExpectedRevenue / 1000).toFixed(1)}k
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info text */}
        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: 12,
            marginTop: 12,
          }}
        >
          Tap on a stage to see the 3 largest opportunities
        </Text>
      </View>

      {/* Modal with top opportunities */}
      <Modal
        visible={selectedStage !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStage(null)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.background,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.textPrimary,
              }}
            >
              {selectedStage?.stageName}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedStage(null)}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Opportunities list */}
          <FlatList
            data={(selectedStage?.opportunities ?? [])
              .sort((a, b) => (b.expectedRevenue || 0) - (a.expectedRevenue || 0))
              .slice(0, 5)}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.opportunityCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  {item.partnerName}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.primary,
                    }}
                  >
                    ${(item.expectedRevenue / 1000).toFixed(1)}k
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="flash-outline"
                      size={14}
                      color={colors.warning}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.warning,
                      }}
                    >
                      {item.probability}%
                    </Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: 'center',
                  color: colors.textSecondary,
                  marginTop: 24,
                }}
              >
                No opportunities in this stage.
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  funnelContainer: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  funnelSegmentWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  funnelSegment: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContent: {
    alignItems: 'center',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  segmentCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  segmentRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  opportunityCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
});

