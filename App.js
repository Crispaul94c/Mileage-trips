import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';

const STORAGE_KEY = 'mileage_trip_history_v3';
const PROFILE_KEY = 'mileage_company_profile_v1';

const DEFAULT_PROFILE = {
  companyName: "MARKKO'S Transportation",
  address: '8224 Guava Avenue',
  cityStateZip: 'Buena Park, CA 90620',
  phone: '(714) 404-5148',
  fax: '(657) 214-2149',
  logoUri: '',
  logoData: '',
};

const today = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
};

const emptyTrip = () => ({
  id: Date.now().toString(),
  createdAt: new Date().toISOString(),

  driver: '',
  truck: '',

  mileageEntries: [
    {
      id: `${Date.now()}-m1`,
      date: today(),
      state: '',
      highway: '',
      odometer: '',
    },
  ],

  routes: [
    {
      id: `${Date.now()}-r1`,
      from: '',
      to: '',
    },
  ],

  fuelEntries: [
    {
      id: `${Date.now()}-f1`,
      date: today(),
      vendor: '',
      gallons: '',
      cost: '',
    },
  ],
});

export default function App() {
  const [screen, setScreen] = useState('home');
  const [trips, setTrips] = useState([]);
  const [trip, setTrip] = useState(emptyTrip());
  const [editingId, setEditingId] = useState(null);
  const [viewTrip, setViewTrip] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTrips();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROFILE_KEY);
      if (saved) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
    } catch (error) {
      Alert.alert('Error', 'Could not load the company profile.');
    }
  };

  const saveProfile = async () => {
    if (!profile.companyName.trim()) {
      Alert.alert('Missing Company', 'Please enter the company name.');
      return;
    }

    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      Alert.alert('Profile Saved', 'The PDF letterhead has been updated.');
      setScreen('home');
    } catch (error) {
      Alert.alert('Save Error', 'Could not save the company profile.');
    }
  };

  const pickImage = async (onSelected) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Allow photo access to select an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.65,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) onSelected(result.assets[0]);
  };

  const pickReceipt = (index) => {
    pickImage((asset) => updateFuel(index, 'receiptUri', asset.uri));
  };

  const loadTrips = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        setTrips(JSON.parse(saved));
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not load saved trips.'
      );
    }
  };

  const saveTripsToPhone = async (newTrips) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(newTrips)
      );

      setTrips(newTrips);
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not save trip.'
      );
    }
  };

  const startNewTrip = () => {
    setTrip(emptyTrip());
    setEditingId(null);
    setScreen('editor');
  };

  const editTrip = (savedTrip) => {
    setTrip(
      JSON.parse(
        JSON.stringify(savedTrip)
      )
    );

    setEditingId(savedTrip.id);
    setScreen('editor');
  };

  const openTripSheet = (savedTrip) => {
    setViewTrip(savedTrip);
    setScreen('sheet');
  };

  const updateBasic = (field, value) => {
    setTrip({
      ...trip,
      [field]: value,
    });
  };

  const updateMileage = (
    index,
    field,
    value
  ) => {
    const updated = [
      ...trip.mileageEntries,
    ];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setTrip({
      ...trip,
      mileageEntries: updated,
    });
  };

  const addMileage = () => {
    setTrip({
      ...trip,

      mileageEntries: [
        ...trip.mileageEntries,

        {
          id: `${Date.now()}-m`,
          date: today(),
          state: '',
          highway: '',
          odometer: '',
        },
      ],
    });
  };

  const removeMileage = (index) => {
    if (
      trip.mileageEntries.length === 1
    ) {
      return;
    }

    setTrip({
      ...trip,

      mileageEntries:
        trip.mileageEntries.filter(
          (_, i) => i !== index
        ),
    });
  };

  const updateRoute = (
    index,
    field,
    value
  ) => {
    const updated = [
      ...trip.routes,
    ];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setTrip({
      ...trip,
      routes: updated,
    });
  };

  const addRoute = () => {
    setTrip({
      ...trip,

      routes: [
        ...trip.routes,

        {
          id: `${Date.now()}-r`,
          from: '',
          to: '',
        },
      ],
    });
  };

  const removeRoute = (index) => {
    if (trip.routes.length === 1) {
      return;
    }

    setTrip({
      ...trip,

      routes: trip.routes.filter(
        (_, i) => i !== index
      ),
    });
  };

  const updateFuel = (
    index,
    field,
    value
  ) => {
    const updated = [
      ...trip.fuelEntries,
    ];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setTrip({
      ...trip,
      fuelEntries: updated,
    });
  };

  const addFuel = () => {
    setTrip({
      ...trip,

      fuelEntries: [
        ...trip.fuelEntries,

        {
          id: `${Date.now()}-f`,
          date: today(),
          vendor: '',
          gallons: '',
          cost: '',
        },
      ],
    });
  };

  const removeFuel = (index) => {
    if (
      trip.fuelEntries.length === 1
    ) {
      return;
    }

    setTrip({
      ...trip,

      fuelEntries:
        trip.fuelEntries.filter(
          (_, i) => i !== index
        ),
    });
  };

  const calculateMiles = (
    selectedTrip = trip
  ) => {
    const readings =
      selectedTrip.mileageEntries
        .map((item) =>
          Number(item.odometer)
        )
        .filter(
          (value) =>
            !isNaN(value) &&
            value > 0
        );

    if (readings.length < 2) {
      return 0;
    }

    return (
      Math.max(...readings) -
      Math.min(...readings)
    );
  };

  const calculateFuelCost = (
    selectedTrip = trip
  ) => {
    return selectedTrip.fuelEntries.reduce(
      (total, item) => {
        const cost = Number(item.cost);

        return (
          total +
          (isNaN(cost) ? 0 : cost)
        );
      },
      0
    );
  };

  const calculateGallons = (
    selectedTrip = trip
  ) => {
    return selectedTrip.fuelEntries.reduce(
      (total, item) => {
        const gallons =
          Number(item.gallons);

        return (
          total +
          (
            isNaN(gallons)
              ? 0
              : gallons
          )
        );
      },
      0
    );
  };

  const calculateMPG = (
    selectedTrip = trip
  ) => {
    const miles =
      calculateMiles(selectedTrip);

    const gallons =
      calculateGallons(selectedTrip);

    if (gallons <= 0) {
      return 0;
    }

    return miles / gallons;
  };

  const saveTrip = async () => {
    if (!trip.driver.trim()) {
      Alert.alert(
        'Missing Driver',
        'Please enter the driver name.'
      );

      return;
    }

    let newTrips;

    if (editingId) {
      newTrips = trips.map((item) =>
        item.id === editingId
          ? {
              ...trip,
              updatedAt:
                new Date().toISOString(),
            }
          : item
      );
    } else {
      const finishedTrip = {
        ...trip,

        id:
          Date.now().toString(),

        createdAt:
          new Date().toISOString(),
      };

      newTrips = [
        finishedTrip,
        ...trips,
      ];
    }

    await saveTripsToPhone(newTrips);

    Alert.alert(
      'Trip Saved',
      'The trip was saved on this device.'
    );

    setScreen('home');
  };

  const deleteTrip = (id) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            const newTrips =
              trips.filter(
                (item) =>
                  item.id !== id
              );

            await saveTripsToPhone(
              newTrips
            );
          },
        },
      ]
    );
  };

  const escapeHtml = (
    value = ''
  ) => {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const createTripHTML = (
    selectedTrip
  ) => {
    const mileageRows =
      selectedTrip.mileageEntries
        .map(
          (entry) => `
            <tr>
              <td>${escapeHtml(
                entry.date
              )}</td>

              <td>${escapeHtml(
                entry.state
              )}</td>

              <td>${escapeHtml(
                entry.highway
              )}</td>

              <td>${escapeHtml(
                entry.odometer
              )}</td>
            </tr>
          `
        )
        .join('');

    const routeRows =
      selectedTrip.routes
        .map(
          (route) => `
            <div class="route-row">

              <div>
                <b>FROM:</b>
                ${escapeHtml(
                  route.from
                )}
              </div>

              <div>
                <b>TO:</b>
                ${escapeHtml(
                  route.to
                )}
              </div>

            </div>
          `
        )
        .join('');

    const fuelRows =
      selectedTrip.fuelEntries
        .map(
          (fuel) => `
            <tr>

              <td>
                ${escapeHtml(
                  fuel.date
                )}
              </td>

              <td>
                ${escapeHtml(
                  fuel.vendor
                )}
              </td>

              <td>
                ${escapeHtml(
                  fuel.gallons
                )}
              </td>

              <td>
                ${
                  fuel.cost
                    ? '$' +
                      Number(
                        fuel.cost
                      ).toFixed(2)
                    : ''
                }
              </td>

            </tr>
          `
        )
        .join('');

    return `
<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8" />

<style>

@page {
  size: letter;
  margin: 0.35in;
}

* {
  box-sizing: border-box;
}

body {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  margin: 0;
  font-size: 11px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.company {
  width: 48%;
  line-height: 1.35;
}

.company-name {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 3px;
}

.title-box {
  width: 34%;
  text-align: center;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.05;
}

.driver-row {
  display: flex;
  gap: 18px;
  margin: 14px 0 10px;
}

.line-field {
  flex: 1;
  border-bottom: 1px solid #111;
  padding-bottom: 3px;
}

.label {
  font-weight: 800;
  margin-right: 6px;
}

.section-title {
  font-weight: 900;
  margin-top: 14px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #111;
  padding: 5px 6px;
  text-align: left;
  height: 24px;
}

th {
  font-weight: 900;
  background: #f1f1f1;
}

.route-row {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid #111;
  padding: 5px 0;
}

.route-row > div {
  flex: 1;
}

.summary {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-weight: 700;
}

.summary span {
  border: 1px solid #bbb;
  padding: 6px 8px;
  border-radius: 5px;
}

</style>

</head>

<body>

<div class="header">

  <div class="company">

    ${profile.logoData ? `<img src="${profile.logoData}" style="max-width:120px;max-height:58px;margin-bottom:6px;object-fit:contain" />` : ''}

    <div class="company-name">
      ${escapeHtml(profile.companyName)}
    </div>

    <div>
      ${escapeHtml(profile.address)}
    </div>

    <div>
      ${escapeHtml(profile.cityStateZip)}
    </div>

    <div>
      ${escapeHtml(profile.phone)}
      &nbsp;
      ${profile.fax ? `Fax ${escapeHtml(profile.fax)}` : ''}
    </div>

  </div>

  <div class="title-box">
    MILEAGE
    <br />
    TRIP
    <br />
    SHEET
  </div>

</div>

<div class="driver-row">

  <div class="line-field">

    <span class="label">
      DRIVER
    </span>

    ${escapeHtml(
      selectedTrip.driver
    )}

  </div>

  <div class="line-field">

    <span class="label">
      TRUCK/TRAILER #
    </span>

    ${escapeHtml(
      selectedTrip.truck
    )}

  </div>

</div>

<table>

<thead>

<tr>

<th>
DATE
</th>

<th>
STATE
</th>

<th>
HWY USED
</th>

<th>
ODOMETER READING
</th>

</tr>

</thead>

<tbody>

${mileageRows}

</tbody>

</table>

<div class="section-title">
CITIES:
</div>

${routeRows}

<div class="section-title">
FUEL PURCHASE:
</div>

<table>

<thead>

<tr>

<th>
DATE
</th>

<th>
VENDOR
</th>

<th>
GALLONS
</th>

<th>
COST
</th>

</tr>

</thead>

<tbody>

${fuelRows}

</tbody>

</table>

<div class="summary">

<span>
Total Miles:
${calculateMiles(
  selectedTrip
)}
</span>

<span>
Total Gallons:
${calculateGallons(
  selectedTrip
).toFixed(2)}
</span>

<span>
Total Fuel:
$${calculateFuelCost(
  selectedTrip
).toFixed(2)}
</span>

<span>
MPG:
${calculateMPG(
  selectedTrip
).toFixed(2)}
</span>

</div>

</body>

</html>
    `;
  };

  const sharePDF = async (
    selectedTrip
  ) => {
    try {
      const { uri } =
        await Print.printToFileAsync({
          html:
            createTripHTML(
              selectedTrip
            ),
        });

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          'PDF Created',
          uri
        );

        return;
      }

      await Sharing.shareAsync(
        uri,
        {
          mimeType:
            'application/pdf',

          UTI:
            'com.adobe.pdf',

          dialogTitle:
            'Mileage Trip Sheet',
        }
      );
    } catch (error) {
      Alert.alert(
        'PDF Error',
        error.message
      );
    }
  };

  const printTrip = async (
    selectedTrip
  ) => {
    try {
      await Print.printAsync({
        html:
          createTripHTML(
            selectedTrip
          ),
      });
    } catch (error) {
      Alert.alert(
        'Print Error',
        error.message
      );
    }
  };

  if (screen === 'home') {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const visibleTrips = trips.filter((item) => {
      if (!normalizedSearch) return true;
      return [
        item.driver,
        item.truck,
        ...(item.routes || []).flatMap((route) => [route.from, route.to]),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
    const reportMiles = trips.reduce((sum, item) => sum + calculateMiles(item), 0);
    const reportFuel = trips.reduce((sum, item) => sum + calculateFuelCost(item), 0);

    return (
      <SafeAreaView
        style={styles.container}
      >

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >

          <Text
            style={styles.title}
          >
            Mileage Trips
          </Text>

          <Text
            style={styles.subtitle}
          >
            {profile.companyName} · Digital Trip Sheets
          </Text>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setScreen('profile')}>
              <Text style={styles.secondaryButtonText}>Company Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportRow}>
            <View style={styles.reportCard}>
              <Text style={styles.reportValue}>{trips.length}</Text>
              <Text style={styles.reportLabel}>Trips</Text>
            </View>
            <View style={styles.reportCard}>
              <Text style={styles.reportValue}>{reportMiles.toLocaleString()}</Text>
              <Text style={styles.reportLabel}>Miles</Text>
            </View>
            <View style={styles.reportCard}>
              <Text style={styles.reportValue}>${reportFuel.toFixed(0)}</Text>
              <Text style={styles.reportLabel}>Fuel</Text>
            </View>
          </View>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            onPress={startNewTrip}
          >

            <Text
              style={
                styles.primaryButtonText
              }
            >
              + New Trip
            </Text>

          </TouchableOpacity>

          <Text
            style={
              styles.historyTitle
            }
          >
            Trip History
          </Text>

          <TextInput
            style={[styles.input, styles.searchInput]}
            placeholder="Search driver, truck or route"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {visibleTrips.length === 0 ? (

            <View
              style={styles.emptyCard}
            >

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {trips.length === 0 ? 'No saved trips' : 'No matching trips'}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Your saved trip
                sheets will appear here.
              </Text>

            </View>

          ) : (

            visibleTrips.map(
              (savedTrip) => (

                <View
                  key={savedTrip.id}
                  style={
                    styles.tripCard
                  }
                >

                  <Text
                    style={
                      styles.tripDriver
                    }
                  >
                    {
                      savedTrip.driver
                    }
                  </Text>

                  <Text
                    style={
                      styles.tripInfo
                    }
                  >
                    Truck / Trailer:{' '}
                    {savedTrip.truck ||
                      '—'}
                  </Text>

                  <Text
                    style={
                      styles.tripInfo
                    }
                  >
                    Total Miles:{' '}
                    {calculateMiles(
                      savedTrip
                    )}
                  </Text>

                  <Text
                    style={
                      styles.tripInfo
                    }
                  >
                    Gallons:{' '}
                    {calculateGallons(
                      savedTrip
                    ).toFixed(2)}
                  </Text>

                  <Text
                    style={
                      styles.tripInfo
                    }
                  >
                    Fuel: $
                    {calculateFuelCost(
                      savedTrip
                    ).toFixed(2)}
                  </Text>

                  <Text
                    style={
                      styles.tripInfo
                    }
                  >
                    MPG:{' '}
                    {calculateMPG(
                      savedTrip
                    ).toFixed(2)}
                  </Text>

                  <Text
                    style={
                      styles.tripDate
                    }
                  >
                    {new Date(
                      savedTrip.createdAt
                    ).toLocaleDateString()}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.viewButton
                    }
                    onPress={() =>
                      openTripSheet(
                        savedTrip
                      )
                    }
                  >

                    <Text
                      style={
                        styles.viewButtonText
                      }
                    >
                      View Trip Sheet
                    </Text>

                  </TouchableOpacity>

                  <View
                    style={
                      styles.pdfRow
                    }
                  >

                    <TouchableOpacity
                      style={
                        styles.pdfButton
                      }
                      onPress={() =>
                        sharePDF(
                          savedTrip
                        )
                      }
                    >

                      <Text
                        style={
                          styles.pdfButtonText
                        }
                      >
                        PDF
                      </Text>

                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.pdfButton
                      }
                      onPress={() =>
                        printTrip(
                          savedTrip
                        )
                      }
                    >

                      <Text
                        style={
                          styles.pdfButtonText
                        }
                      >
                        Print
                      </Text>

                    </TouchableOpacity>

                  </View>

                  <View
                    style={
                      styles.tripActions
                    }
                  >

                    <TouchableOpacity
                      style={
                        styles.editButton
                      }
                      onPress={() =>
                        editTrip(
                          savedTrip
                        )
                      }
                    >

                      <Text
                        style={
                          styles.editButtonText
                        }
                      >
                        Open / Edit
                      </Text>

                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.deleteButton
                      }
                      onPress={() =>
                        deleteTrip(
                          savedTrip.id
                        )
                      }
                    >

                      <Text
                        style={
                          styles.deleteButtonText
                        }
                      >
                        Delete
                      </Text>

                    </TouchableOpacity>

                  </View>

                </View>

              )
            )

          )}

        </ScrollView>

      </SafeAreaView>
    );
  }

  if (screen === 'profile') {
    const profileFields = [
      ['companyName', 'Company name', "MARKKO'S Transportation"],
      ['address', 'Street address', '8224 Guava Avenue'],
      ['cityStateZip', 'City, state and ZIP', 'Buena Park, CA 90620'],
      ['phone', 'Phone', '(714) 404-5148'],
      ['fax', 'Fax', '(657) 214-2149'],
    ];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setScreen('home')}>
            <Text style={styles.backText}>‹ Back to Trips</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Company Profile</Text>
          <Text style={styles.subtitle}>These details appear on every PDF.</Text>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Logo & Letterhead</Text>
            {profile.logoUri ? <Image source={{ uri: profile.logoUri }} style={styles.logoPreview} /> : (
              <View style={styles.logoPlaceholder}><Text style={styles.logoPlaceholderText}>Company Logo</Text></View>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => pickImage((asset) => setProfile({
                ...profile,
                logoUri: asset.uri,
                logoData: asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : '',
              }))}
            >
              <Text style={styles.addButtonText}>Choose Logo</Text>
            </TouchableOpacity>
            {profileFields.map(([field, label, placeholder]) => (
              <View key={field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  value={profile[field]}
                  onChangeText={(value) => setProfile({ ...profile, [field]: value })}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>Save Company Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (
    screen === 'sheet' &&
    viewTrip
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >

          <TouchableOpacity
            onPress={() =>
              setScreen('home')
            }
          >

            <Text
              style={styles.backText}
            >
              ‹ Back to Trips
            </Text>

          </TouchableOpacity>

          <View
            style={styles.sheetCard}
          >

            {profile.logoUri ? (
              <Image
                source={{ uri: profile.logoUri }}
                style={styles.sheetLogo}
              />
            ) : null}

            <Text
              style={
                styles.sheetCompany
              }
            >
              {profile.companyName}
            </Text>

            <Text
              style={
                styles.sheetAddress
              }
            >
              {profile.address}
            </Text>

            <Text
              style={
                styles.sheetAddress
              }
            >
              {profile.cityStateZip}
            </Text>

            {(profile.phone || profile.fax) ? (
              <Text style={styles.sheetAddress}>
                {[profile.phone, profile.fax ? `Fax ${profile.fax}` : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            <Text
              style={
                styles.sheetTitle
              }
            >
              MILEAGE TRIP SHEET
            </Text>

            <View
              style={styles.infoRow}
            >

              <View
                style={
                  styles.infoBlock
                }
              >

                <Text
                  style={
                    styles.sheetLabel
                  }
                >
                  DRIVER
                </Text>

                <Text
                  style={
                    styles.sheetValue
                  }
                >
                  {viewTrip.driver ||
                    '—'}
                </Text>

              </View>

              <View
                style={
                  styles.infoBlock
                }
              >

                <Text
                  style={
                    styles.sheetLabel
                  }
                >
                  TRUCK / TRAILER #
                </Text>

                <Text
                  style={
                    styles.sheetValue
                  }
                >
                  {viewTrip.truck ||
                    '—'}
                </Text>

              </View>

            </View>

            <Text
              style={
                styles.sheetSectionTitle
              }
            >
              MILEAGE
            </Text>

            <View
              style={styles.table}
            >

              <View
                style={
                  styles.tableHeader
                }
              >

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellDate,
                  ]}
                >
                  DATE
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellState,
                  ]}
                >
                  STATE
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellHighway,
                  ]}
                >
                  HWY
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellOdo,
                  ]}
                >
                  ODOMETER
                </Text>

              </View>

              {viewTrip.mileageEntries.map(
                (entry) => (

                  <View
                    style={
                      styles.tableRow
                    }
                    key={entry.id}
                  >

                    <Text
                      style={[
                        styles.cell,
                        styles.cellDate,
                      ]}
                    >
                      {entry.date ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellState,
                      ]}
                    >
                      {entry.state ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellHighway,
                      ]}
                    >
                      {entry.highway ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellOdo,
                      ]}
                    >
                      {entry.odometer ||
                        '—'}
                    </Text>

                  </View>

                )
              )}

            </View>

            <Text
              style={
                styles.sheetTotal
              }
            >
              Total Miles:{' '}
              {calculateMiles(
                viewTrip
              )}
            </Text>

            <Text
              style={
                styles.sheetSectionTitle
              }
            >
              CITIES / ROUTES
            </Text>

            {viewTrip.routes.map(
              (route) => (

                <View
                  style={
                    styles.routeLine
                  }
                  key={route.id}
                >

                  <Text
                    style={
                      styles.routeText
                    }
                  >
                    FROM:{' '}
                    {route.from ||
                      '—'}
                  </Text>

                  <Text
                    style={
                      styles.routeText
                    }
                  >
                    TO:{' '}
                    {route.to ||
                      '—'}
                  </Text>

                </View>

              )
            )}

            <Text
              style={
                styles.sheetSectionTitle
              }
            >
              FUEL PURCHASE
            </Text>

            <View
              style={styles.table}
            >

              <View
                style={
                  styles.tableHeader
                }
              >

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellDate,
                  ]}
                >
                  DATE
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellVendor,
                  ]}
                >
                  VENDOR
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellGallons,
                  ]}
                >
                  GAL
                </Text>

                <Text
                  style={[
                    styles.cellHeader,
                    styles.cellCost,
                  ]}
                >
                  COST
                </Text>

              </View>

              {viewTrip.fuelEntries.map(
                (fuel) => (

                  <View
                    style={
                      styles.tableRow
                    }
                    key={fuel.id}
                  >

                    <Text
                      style={[
                        styles.cell,
                        styles.cellDate,
                      ]}
                    >
                      {fuel.date ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellVendor,
                      ]}
                    >
                      {fuel.vendor ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellGallons,
                      ]}
                    >
                      {fuel.gallons ||
                        '—'}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.cellCost,
                      ]}
                    >
                      {fuel.cost
                        ? `$${Number(
                            fuel.cost
                          ).toFixed(2)}`
                        : '—'}
                    </Text>

                  </View>

                )
              )}

            </View>

            <View
              style={
                styles.summaryBox
              }
            >

              <Text
                style={
                  styles.summaryText
                }
              >
                Total Miles:{' '}
                {calculateMiles(
                  viewTrip
                )}
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                Total Gallons:{' '}
                {calculateGallons(
                  viewTrip
                ).toFixed(2)}
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                Fuel Cost: $
                {calculateFuelCost(
                  viewTrip
                ).toFixed(2)}
              </Text>

              <Text
                style={
                  styles.summaryText
                }
              >
                MPG:{' '}
                {calculateMPG(
                  viewTrip
                ).toFixed(2)}
              </Text>

            </View>

          </View>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            onPress={() =>
              sharePDF(
                viewTrip
              )
            }
          >

            <Text
              style={
                styles.primaryButtonText
              }
            >
              Generate / Share PDF
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.outlineButton
            }
            onPress={() =>
              printTrip(
                viewTrip
              )
            }
          >

            <Text
              style={
                styles.outlineButtonText
              }
            >
              Print Trip Sheet
            </Text>

          </TouchableOpacity>

        </ScrollView>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        <TouchableOpacity
          onPress={() =>
            setScreen('home')
          }
        >

          <Text
            style={styles.backText}
          >
            ‹ Back to Trips
          </Text>

        </TouchableOpacity>

        <Text
          style={styles.title}
        >
          Mileage Trip Sheet
        </Text>

        <Text
          style={styles.subtitle}
        >
          {editingId
            ? 'Edit Trip'
            : 'New Trip'}
        </Text>

        <View style={styles.card}>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Trip Information
          </Text>

          <Text
            style={styles.label}
          >
            Driver
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Driver name"
            value={trip.driver}
            onChangeText={(value) =>
              updateBasic(
                'driver',
                value
              )
            }
          />

          <Text
            style={styles.label}
          >
            Truck / Trailer #
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: 519"
            value={trip.truck}
            onChangeText={(value) =>
              updateBasic(
                'truck',
                value
              )
            }
          />

        </View>

        <View style={styles.card}>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Mileage Entries
          </Text>

          {trip.mileageEntries.map(
            (entry, index) => (

              <View
                key={entry.id}
                style={
                  styles.entryBox
                }
              >

                <View
                  style={
                    styles.entryHeader
                  }
                >

                  <Text
                    style={
                      styles.entryTitle
                    }
                  >
                    Reading{' '}
                    {index + 1}
                  </Text>

                  {trip
                    .mileageEntries
                    .length > 1 && (

                    <TouchableOpacity
                      onPress={() =>
                        removeMileage(
                          index
                        )
                      }
                    >

                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Remove
                      </Text>

                    </TouchableOpacity>

                  )}

                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  Date
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="08/24/2026"
                  value={entry.date}
                  onChangeText={(
                    value
                  ) =>
                    updateMileage(
                      index,
                      'date',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  State
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="CA"
                  value={
                    entry.state
                  }
                  autoCapitalize="characters"
                  onChangeText={(
                    value
                  ) =>
                    updateMileage(
                      index,
                      'state',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  Highway Used
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="I-5"
                  value={
                    entry.highway
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateMileage(
                      index,
                      'highway',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  Odometer Reading
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="507198"
                  value={
                    entry.odometer
                  }
                  keyboardType="number-pad"
                  onChangeText={(
                    value
                  ) =>
                    updateMileage(
                      index,
                      'odometer',
                      value
                    )
                  }
                />

                {index > 0 &&
                  Number(
                    entry.odometer
                  ) > 0 &&
                  Number(
                    trip
                      .mileageEntries[
                      index - 1
                    ]
                      .odometer
                  ) > 0 && (

                    <Text
                      style={
                        styles.segmentMiles
                      }
                    >
                      Miles since
                      last reading:{' '}
                      {Math.abs(
                        Number(
                          entry.odometer
                        ) -
                          Number(
                            trip
                              .mileageEntries[
                              index -
                                1
                            ]
                              .odometer
                          )
                      )}
                    </Text>

                  )}

              </View>

            )
          )}

          <TouchableOpacity
            style={
              styles.addButton
            }
            onPress={
              addMileage
            }
          >

            <Text
              style={
                styles.addButtonText
              }
            >
              + Add Mileage Reading
            </Text>

          </TouchableOpacity>

          <Text
            style={
              styles.totalText
            }
          >
            Total Miles:{' '}
            {calculateMiles()}
          </Text>

        </View>

        <View style={styles.card}>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Cities / Routes
          </Text>

          {trip.routes.map(
            (route, index) => (

              <View
                key={route.id}
                style={
                  styles.entryBox
                }
              >

                <View
                  style={
                    styles.entryHeader
                  }
                >

                  <Text
                    style={
                      styles.entryTitle
                    }
                  >
                    Route{' '}
                    {index + 1}
                  </Text>

                  {trip.routes
                    .length > 1 && (

                    <TouchableOpacity
                      onPress={() =>
                        removeRoute(
                          index
                        )
                      }
                    >

                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Remove
                      </Text>

                    </TouchableOpacity>

                  )}

                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  From
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="Los Angeles"
                  value={
                    route.from
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateRoute(
                      index,
                      'from',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  To
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="Portland"
                  value={
                    route.to
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateRoute(
                      index,
                      'to',
                      value
                    )
                  }
                />

              </View>

            )
          )}

          <TouchableOpacity
            style={
              styles.addButton
            }
            onPress={
              addRoute
            }
          >

            <Text
              style={
                styles.addButtonText
              }
            >
              + Add Route
            </Text>

          </TouchableOpacity>

        </View>

        <View style={styles.card}>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Fuel Purchases
          </Text>

          {trip.fuelEntries.map(
            (fuel, index) => (

              <View
                key={fuel.id}
                style={
                  styles.entryBox
                }
              >

                <View
                  style={
                    styles.entryHeader
                  }
                >

                  <Text
                    style={
                      styles.entryTitle
                    }
                  >
                    Fuel Stop{' '}
                    {index + 1}
                  </Text>

                  {trip
                    .fuelEntries
                    .length > 1 && (

                    <TouchableOpacity
                      onPress={() =>
                        removeFuel(
                          index
                        )
                      }
                    >

                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Remove
                      </Text>

                    </TouchableOpacity>

                  )}

                </View>

                <Text
                  style={
                    styles.label
                  }
                >
                  Date
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="08/24/2026"
                  value={
                    fuel.date
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateFuel(
                      index,
                      'date',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  Vendor
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="Pilot, Loves, Shell..."
                  value={
                    fuel.vendor
                  }
                  onChangeText={(
                    value
                  ) =>
                    updateFuel(
                      index,
                      'vendor',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  Gallons
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="80.5"
                  value={
                    fuel.gallons
                  }
                  keyboardType="decimal-pad"
                  onChangeText={(
                    value
                  ) =>
                    updateFuel(
                      index,
                      'gallons',
                      value
                    )
                  }
                />

                <Text
                  style={
                    styles.label
                  }
                >
                  Cost
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="350.00"
                  value={
                    fuel.cost
                  }
                  keyboardType="decimal-pad"
                  onChangeText={(
                    value
                  ) =>
                    updateFuel(
                      index,
                      'cost',
                      value
                    )
                  }
                />

                <TouchableOpacity style={styles.receiptButton} onPress={() => pickReceipt(index)}>
                  <Text style={styles.receiptButtonText}>
                    {fuel.receiptUri ? 'Replace Receipt Photo' : '+ Add Receipt Photo'}
                  </Text>
                </TouchableOpacity>
                {fuel.receiptUri ? (
                  <Image source={{ uri: fuel.receiptUri }} style={styles.receiptPreview} />
                ) : null}

              </View>

            )
          )}

          <TouchableOpacity
            style={
              styles.addButton
            }
            onPress={
              addFuel
            }
          >

            <Text
              style={
                styles.addButtonText
              }
            >
              + Add Fuel Purchase
            </Text>

          </TouchableOpacity>

          <Text
            style={
              styles.totalText
            }
          >
            Total Gallons:{' '}
            {calculateGallons().toFixed(
              2
            )}
          </Text>

          <Text
            style={
              styles.totalText
            }
          >
            Total Fuel Cost: $
            {calculateFuelCost().toFixed(
              2
            )}
          </Text>

          <Text
            style={
              styles.totalText
            }
          >
            MPG:{' '}
            {calculateMPG().toFixed(
              2
            )}
          </Text>

        </View>

        <TouchableOpacity
          style={
            styles.primaryButton
          }
          onPress={
            saveTrip
          }
        >

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {editingId
              ? 'Update Trip'
              : 'Save Trip'}
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f5f6',
  },

  content: {
    padding: 18,
    paddingBottom: 80,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },

  topActions: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },

  secondaryButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  secondaryButtonText: {
    color: '#075985',
    fontWeight: '800',
  },

  reportRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  reportCard: {
    flex: 1,
    backgroundColor: '#0f766e',
    borderRadius: 14,
    padding: 13,
  },

  reportValue: {
    color: 'white',
    fontSize: 19,
    fontWeight: '900',
  },

  reportLabel: {
    color: '#ccfbf1',
    fontSize: 12,
    marginTop: 3,
  },

  searchInput: {
    marginBottom: 16,
    backgroundColor: 'white',
  },

  logoPreview: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    marginBottom: 12,
  },

  logoPlaceholder: {
    height: 110,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logoPlaceholderText: {
    color: '#64748b',
    fontWeight: '700',
  },

  receiptButton: {
    marginTop: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },

  receiptButtonText: {
    color: '#075985',
    fontWeight: '800',
  },

  receiptPreview: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    borderRadius: 10,
    marginTop: 10,
  },

  backText: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 12,
  },

  historyTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 15,
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
  },

  entryBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },

  entryHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  entryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 5,
  },

  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },

  primaryButton: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginBottom: 16,
  },

  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },

  outlineButton: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 22,
  },

  outlineButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  addButton: {
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 11,
    padding: 13,
    alignItems: 'center',
  },

  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  removeText: {
    color: '#dc2626',
    fontWeight: '700',
  },

  totalText: {
    marginTop: 15,
    fontSize: 17,
    fontWeight: '800',
  },

  segmentMiles: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  emptyText: {
    marginTop: 5,
    color: '#6b7280',
    textAlign: 'center',
  },

  tripCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
  },

  tripDriver: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },

  tripInfo: {
    fontSize: 15,
    marginBottom: 3,
  },

  tripDate: {
    color: '#6b7280',
    marginTop: 7,
  },

  tripActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },

  viewButton: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },

  viewButtonText: {
    color: 'white',
    fontWeight: '700',
  },

  pdfRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },

  pdfButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 10,
    padding: 11,
    alignItems: 'center',
  },

  pdfButtonText: {
    color: '#111827',
    fontWeight: '800',
  },

  editButton: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  editButtonText: {
    color: 'white',
    fontWeight: '700',
  },

  deleteButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dc2626',
  },

  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '700',
  },

  sheetCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
  },

  sheetLogo: {
    width: '100%',
    height: 72,
    resizeMode: 'contain',
    marginBottom: 8,
  },

  sheetCompany: {
    fontSize: 18,
    fontWeight: '900',
  },

  sheetAddress: {
    fontSize: 12,
    color: '#374151',
  },

  sheetTitle: {
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },

  infoBlock: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    paddingBottom: 5,
  },

  sheetLabel: {
    fontSize: 11,
    fontWeight: '800',
  },

  sheetValue: {
    fontSize: 15,
    marginTop: 4,
  },

  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 18,
    marginBottom: 8,
  },

  table: {
    borderWidth: 1,
    borderColor: '#111827',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
  },

  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },

  cellHeader: {
    fontSize: 10,
    fontWeight: '900',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#111827',
  },

  cell: {
    fontSize: 10,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#111827',
  },

  cellDate: {
    flex: 1.2,
  },

  cellState: {
    flex: 0.7,
  },

  cellHighway: {
    flex: 1,
  },

  cellOdo: {
    flex: 1.3,
    borderRightWidth: 0,
  },

  cellVendor: {
    flex: 1.4,
  },

  cellGallons: {
    flex: 0.8,
  },

  cellCost: {
    flex: 1,
    borderRightWidth: 0,
  },

  sheetTotal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },

  routeLine: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    paddingVertical: 8,
    gap: 10,
  },

  routeText: {
    flex: 1,
    fontSize: 12,
  },

  summaryBox: {
    marginTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#111827',
    paddingTop: 12,
  },

  summaryText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
});
