import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const STORAGE_KEY = 'mileage_trip_history_v2';

const newTrip = () => ({
  id: Date.now().toString(),
  createdAt: new Date().toISOString(),
  driver: '',
  truck: '',
  entries: [
    {
      id: Date.now().toString() + '-1',
      state: '',
      highway: '',
      odometer: '',
    },
  ],
  gallons: '',
  fuelCost: '',
});

export default function App() {
  const [trips, setTrips] = useState([]);
  const [screen, setScreen] = useState('history');
  const [trip, setTrip] = useState(newTrip());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (loaded) saveTripsToStorage(trips);
  }, [trips, loaded]);

  const loadTrips = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setTrips(JSON.parse(saved));
    } catch (error) {
      console.log(error);
    } finally {
      setLoaded(true);
    }
  };

  const saveTripsToStorage = async data => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log(error);
    }
  };

  const startNewTrip = () => {
    setTrip(newTrip());
    setScreen('edit');
  };

  const openTrip = savedTrip => {
    setTrip(JSON.parse(JSON.stringify(savedTrip)));
    setScreen('edit');
  };

  const updateEntry = (index, field, value) => {
    const copy = [...trip.entries];
    copy[index] = {
      ...copy[index],
      [field]: value,
    };

    setTrip({
      ...trip,
      entries: copy,
    });
  };

  const addEntry = () => {
    setTrip({
      ...trip,
      entries: [
        ...trip.entries,
        {
          id: Date.now().toString(),
          state: '',
          highway: '',
          odometer: '',
        },
      ],
    });
  };

  const removeEntry = index => {
    if (trip.entries.length === 1) {
      Alert.alert('Mileage Entry', 'You must keep at least one entry.');
      return;
    }

    const copy = trip.entries.filter((_, i) => i !== index);

    setTrip({
      ...trip,
      entries: copy,
    });
  };

  const getTotalMiles = currentTrip => {
    const readings = currentTrip.entries
      .map(entry => parseFloat(entry.odometer))
      .filter(number => !isNaN(number));

    if (readings.length < 2) return 0;

    return Math.max(...readings) - Math.min(...readings);
  };

  const getMPG = currentTrip => {
    const miles = getTotalMiles(currentTrip);
    const gallons = parseFloat(currentTrip.gallons);

    if (!gallons || gallons <= 0) return 0;

    return miles / gallons;
  };

  const saveTrip = () => {
    if (!trip.driver.trim()) {
      Alert.alert('Missing Information', 'Enter the driver name.');
      return;
    }

    if (!trip.truck.trim()) {
      Alert.alert('Missing Information', 'Enter the truck / trailer number.');
      return;
    }

    const exists = trips.some(item => item.id === trip.id);

    let updated;

    if (exists) {
      updated = trips.map(item =>
        item.id === trip.id ? trip : item
      );
    } else {
      updated = [trip, ...trips];
    }

    setTrips(updated);
    setScreen('history');
  };

  const deleteTrip = id => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTrips(trips.filter(item => item.id !== id));
          },
        },
      ]
    );
  };

  const createHTML = currentTrip => {
    const miles = getTotalMiles(currentTrip);
    const mpg = getMPG(currentTrip);

    const rows = currentTrip.entries
      .map(
        (entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${entry.state || ''}</td>
            <td>${entry.highway || ''}</td>
            <td>${entry.odometer || ''}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
            }

            h1 {
              text-align: center;
              margin-bottom: 5px;
            }

            .subtitle {
              text-align: center;
              color: #6b7280;
              margin-bottom: 30px;
            }

            .info {
              margin-bottom: 25px;
              font-size: 16px;
              line-height: 1.7;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }

            th, td {
              border: 1px solid #999;
              padding: 10px;
              text-align: left;
            }

            th {
              background: #f1f5f9;
            }

            .summary {
              margin-top: 25px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
            }
          </style>
        </head>

        <body>
          <h1>Mileage Trip Sheet</h1>
          <div class="subtitle">Digital Trip Record</div>

          <div class="info">
            <strong>Driver:</strong> ${currentTrip.driver}<br>
            <strong>Truck / Trailer #:</strong> ${currentTrip.truck}<br>
            <strong>Date:</strong>
            ${new Date(currentTrip.createdAt).toLocaleDateString()}
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>State</th>
                <th>Highway Used</th>
                <th>Odometer</th>
              </tr>
            </thead>

            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="summary">
            <strong>Total Miles:</strong> ${miles.toFixed(0)}<br>
            <strong>Gallons:</strong> ${
              parseFloat(currentTrip.gallons || 0).toFixed(2)
            }<br>
            <strong>Fuel Cost:</strong> $${
              parseFloat(currentTrip.fuelCost || 0).toFixed(2)
            }<br>
            <strong>MPG:</strong> ${mpg.toFixed(2)}
          </div>
        </body>
      </html>
    `;
  };

  const printTrip = async currentTrip => {
    try {
      await Print.printAsync({
        html: createHTML(currentTrip),
      });
    } catch (error) {
      Alert.alert('Print Error', error.message);
    }
  };

  const sharePDF = async currentTrip => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: createHTML(currentTrip),
      });

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        Alert.alert('PDF Created', uri);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Mileage Trip Sheet',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('PDF Error', error.message);
    }
  };

  if (screen === 'history') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Mileage Trips</Text>
          <Text style={styles.subtitle}>Digital Trip Sheets</Text>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={startNewTrip}
          >
            <Text style={styles.mainButtonText}>+ New Trip</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Trip History</Text>

          {trips.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.emptyTitle}>No saved trips</Text>
              <Text style={styles.emptyText}>
                Your saved trip sheets will appear here.
              </Text>
            </View>
          )}

          {trips.map(item => {
            const miles = getTotalMiles(item);
            const mpg = getMPG(item);

            return (
              <View style={styles.card} key={item.id}>
                <Text style={styles.cardTitle}>{item.driver}</Text>

                <Text style={styles.info}>
                  Truck / Trailer: {item.truck}
                </Text>

                <Text style={styles.info}>
                  Total Miles: {miles.toFixed(0)}
                </Text>

                <Text style={styles.info}>
                  Gallons: {parseFloat(item.gallons || 0).toFixed(2)}
                </Text>

                <Text style={styles.info}>
                  Fuel: ${parseFloat(item.fuelCost || 0).toFixed(2)}
                </Text>

                <Text style={styles.info}>
                  MPG: {mpg.toFixed(2)}
                </Text>

                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>

                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openTrip(item)}
                >
                  <Text style={styles.editButtonText}>Open / Edit</Text>
                </TouchableOpacity>

                <View style={styles.pdfRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => sharePDF(item)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Share PDF
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => printTrip(item)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Print
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteTrip(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mileage Trip Sheet</Text>
        <Text style={styles.subtitle}>Digital Trip Record</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip Information</Text>

          <Text style={styles.label}>Driver</Text>
          <TextInput
            style={styles.input}
            value={trip.driver}
            onChangeText={value =>
              setTrip({ ...trip, driver: value })
            }
            placeholder="Driver name"
          />

          <Text style={styles.label}>Truck / Trailer #</Text>
          <TextInput
            style={styles.input}
            value={trip.truck}
            onChangeText={value =>
              setTrip({ ...trip, truck: value })
            }
            placeholder="Truck / Trailer"
          />
        </View>

        <Text style={styles.sectionTitle}>Mileage Entries</Text>

        {trip.entries.map((entry, index) => (
          <View style={styles.card} key={entry.id}>
            <Text style={styles.entryTitle}>
              Mileage Entry {index + 1}
            </Text>

            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              value={entry.state}
              onChangeText={value =>
                updateEntry(index, 'state', value)
              }
              placeholder="CALIFORNIA"
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Highway Used</Text>
            <TextInput
              style={styles.input}
              value={entry.highway}
              onChangeText={value =>
                updateEntry(index, 'highway', value)
              }
              placeholder="5"
            />

            <Text style={styles.label}>Odometer Reading</Text>
            <TextInput
              style={styles.input}
              value={entry.odometer}
              onChangeText={value =>
                updateEntry(index, 'odometer', value)
              }
              placeholder="1000"
              keyboardType="numeric"
            />

            {trip.entries.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeEntry(index)}
              >
                <Text style={styles.deleteButtonText}>
                  Remove Entry
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={addEntry}
        >
          <Text style={styles.addButtonText}>
            + Add Mileage Entry
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fuel Information</Text>

          <Text style={styles.label}>Gallons</Text>
          <TextInput
            style={styles.input}
            value={trip.gallons}
            onChangeText={value =>
              setTrip({ ...trip, gallons: value })
            }
            placeholder="180"
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Fuel Cost ($)</Text>
          <TextInput
            style={styles.input}
            value={trip.fuelCost}
            onChangeText={value =>
              setTrip({ ...trip, fuelCost: value })
            }
            placeholder="1190"
            keyboardType="decimal-pad"
          />

          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Total Miles: {getTotalMiles(trip).toFixed(0)}
            </Text>

            <Text style={styles.summaryText}>
              MPG: {getMPG(trip).toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={saveTrip}
        >
          <Text style={styles.mainButtonText}>Save Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButtonFull}
          onPress={() => sharePDF(trip)}
        >
          <Text style={styles.secondaryButtonText}>
            Generate / Share PDF
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButtonFull}
          onPress={() => printTrip(trip)}
        >
          <Text style={styles.secondaryButtonText}>
            Print Trip Sheet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setScreen('history')}
        >
          <Text style={styles.backText}>Back to Trip History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f1f5f6',
  },

  container: {
    padding: 18,
    paddingBottom: 60,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 15,
  },

  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 25,
  },

  sectionTitle: {
    fontSize: 25,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 15,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  cardTitle: {
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 8,
  },

  entryTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    backgroundColor: '#fafafa',
  },

  mainButton: {
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 22,
  },

  mainButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },

  editButton: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },

  editButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },

  addButton: {
    borderWidth: 2,
    borderColor: '#0f172a',
    padding: 15,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 18,
  },

  addButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 17,
  },

  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f172a',
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  secondaryButtonFull: {
    borderWidth: 1,
    borderColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },

  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 16,
  },

  pdfRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },

  removeButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },

  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '700',
  },

  info: {
    fontSize: 17,
    marginBottom: 3,
  },

  date: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 10,
  },

  summary: {
    backgroundColor: '#f1f5f9',
    padding: 15,
    borderRadius: 12,
    marginTop: 18,
  },

  summaryText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  backButton: {
    padding: 15,
    alignItems: 'center',
  },

  backText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },

  emptyTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },

  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 8,
    fontSize: 16,
  },
});
