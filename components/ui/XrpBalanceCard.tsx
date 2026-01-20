import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
    xrpAmount: number;
    fiatValue: number;
    fiatCurrency: string;
}

const XrpBalanceCard: React.FC<Props> = ({ xrpAmount, fiatValue, fiatCurrency }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.xrpText}>{xrpAmount.toFixed(2)} XRP</Text>
            <Text style={styles.fiatText}>≈ {fiatValue.toFixed(2)} {fiatCurrency}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1f1f1f',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginVertical: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 5,
    },
    xrpText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    fiatText: {
        fontSize: 16,
        color: '#a8a8a8',
        marginTop: 6,
    },
});

export default XrpBalanceCard;
