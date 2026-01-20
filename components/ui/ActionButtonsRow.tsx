import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
    onSend?: () => void;
    onAddMoney?: () => void;
    onRequest?: () => void;
}

export default function ActionButtonsRow({ onSend, onAddMoney, onRequest }: Props) {
    return (
        <View style={styles.container}>
            <ActionButton title="Send" onPress={onSend} />
            <ActionButton title="Add money" onPress={onAddMoney} />
            <ActionButton title="Request" onPress={onRequest} />
        </View>
    );
}

function ActionButton({ title, onPress }: { title: string; onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 12,
    },
    button: {
        backgroundColor: '#2ecc71',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    text: {
        color: '#000',
        fontWeight: '600',
    },
});
