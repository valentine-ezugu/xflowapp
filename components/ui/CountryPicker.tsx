import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountryDto } from '@/types/auth';

interface CountryPickerProps {
  label: string;
  placeholder?: string;
  value: CountryDto | null;
  countries: CountryDto[];
  onSelect: (country: CountryDto) => void;
  error?: boolean;
}

export function CountryPicker({
  label,
  placeholder = 'Select country',
  value,
  countries,
  onSelect,
  error,
}: CountryPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (country: CountryDto) => {
    onSelect(country);
    setModalVisible(false);
    setSearchQuery('');
  };

  const renderCountryItem = ({ item }: { item: CountryDto }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        value?.code === item.code && styles.countryItemSelected,
      ]}
      onPress={() => handleSelect(item)}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      {value?.code === item.code && (
        <Ionicons name="checkmark" size={20} color="#00D4AA" />
      )}
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setModalVisible(true)}
      >
        {value ? (
          <View style={styles.selectedValue}>
            <Text style={styles.selectedFlag}>{value.flag}</Text>
            <Text style={styles.selectedName}>{value.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search country..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            renderItem={renderCountryItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No countries found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  selector: {
    height: 56,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorError: {
    borderColor: '#FF6B6B',
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedFlag: {
    fontSize: 20,
    marginRight: 10,
  },
  selectedName: {
    fontSize: 16,
    color: '#fff',
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  countryItemSelected: {
    backgroundColor: '#0d2922',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
