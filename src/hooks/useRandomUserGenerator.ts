import { useState, useCallback } from 'react';

// US & UK First Names
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Oliver', 'Harry', 'George', 'Jack', 'Noah', 'Leo', 'Oscar', 'Charlie', 'Amelia', 'Olivia',
  'Emma', 'Charlotte', 'Sophia', 'Isabella', 'Mia', 'Evelyn', 'Harper', 'Luna', 'Camila', 'Sofia',
  'Liam', 'Benjamin', 'Elijah', 'Lucas', 'Mason', 'Ethan', 'Alexander', 'Henry', 'Sebastian', 'Daniel'
];

// US & UK Last Names
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
  'Patel', 'Davies', 'Evans', 'Roberts', 'Hughes', 'Green', 'Edwards', 'Baker', 'Nelson', 'Mitchell'
];

// US Streets
const usStreets = [
  'Main Street', 'Oak Avenue', 'Maple Drive', 'Cedar Lane', 'Pine Road', 'Elm Street', 'Washington Boulevard',
  'Park Avenue', 'Lake Drive', 'Sunset Boulevard', 'Highland Avenue', 'Forest Road', 'River Street',
  'Valley View Drive', 'Spring Street', 'Hillside Avenue', 'Meadow Lane', 'Garden Way', 'Church Street'
];

// UK Streets
const ukStreets = [
  'High Street', 'Church Road', 'Station Road', 'Victoria Road', 'Green Lane', 'Manor Road', 'Park Lane',
  'Queens Road', 'Kings Road', 'Mill Lane', 'The Grove', 'Springfield Road', 'George Street', 'York Road',
  'London Road', 'School Lane', 'North Street', 'South Street', 'West End', 'East Road'
];

// US Cities with States and ZIP ranges
const usCities = [
  { city: 'New York', state: 'NY', zipPrefix: '100' },
  { city: 'Los Angeles', state: 'CA', zipPrefix: '900' },
  { city: 'Chicago', state: 'IL', zipPrefix: '606' },
  { city: 'Houston', state: 'TX', zipPrefix: '770' },
  { city: 'Phoenix', state: 'AZ', zipPrefix: '850' },
  { city: 'Philadelphia', state: 'PA', zipPrefix: '191' },
  { city: 'San Antonio', state: 'TX', zipPrefix: '782' },
  { city: 'San Diego', state: 'CA', zipPrefix: '921' },
  { city: 'Dallas', state: 'TX', zipPrefix: '752' },
  { city: 'Austin', state: 'TX', zipPrefix: '787' },
  { city: 'Miami', state: 'FL', zipPrefix: '331' },
  { city: 'Denver', state: 'CO', zipPrefix: '802' },
  { city: 'Seattle', state: 'WA', zipPrefix: '981' },
  { city: 'Boston', state: 'MA', zipPrefix: '021' },
  { city: 'Atlanta', state: 'GA', zipPrefix: '303' }
];

// UK Cities with Postcodes
const ukCities = [
  { city: 'London', postcodePrefix: 'SW' },
  { city: 'Manchester', postcodePrefix: 'M' },
  { city: 'Birmingham', postcodePrefix: 'B' },
  { city: 'Leeds', postcodePrefix: 'LS' },
  { city: 'Glasgow', postcodePrefix: 'G' },
  { city: 'Liverpool', postcodePrefix: 'L' },
  { city: 'Bristol', postcodePrefix: 'BS' },
  { city: 'Edinburgh', postcodePrefix: 'EH' },
  { city: 'Sheffield', postcodePrefix: 'S' },
  { city: 'Newcastle', postcodePrefix: 'NE' },
  { city: 'Nottingham', postcodePrefix: 'NG' },
  { city: 'Cambridge', postcodePrefix: 'CB' },
  { city: 'Oxford', postcodePrefix: 'OX' },
  { city: 'Brighton', postcodePrefix: 'BN' }
];

// Email domains
const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me'];

export interface GeneratedUser {
  name: string;
  email: string;
  phone: string;
  address: string;
  country: 'US' | 'UK';
}

// Session storage for used values to prevent duplicates
const usedEmails = new Set<string>();
const usedPhones = new Set<string>();

const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateUniqueEmail = (firstName: string, lastName: string): string => {
  const sanitizedFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const sanitizedLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const domain = getRandomElement(emailDomains);
  
  let email: string;
  let attempts = 0;
  
  do {
    const separator = getRandomElement(['.', '_', '']);
    const suffix = getRandomNumber(1, 9999);
    const formats = [
      `${sanitizedFirst}${separator}${sanitizedLast}${suffix}@${domain}`,
      `${sanitizedFirst}${suffix}${separator}${sanitizedLast}@${domain}`,
      `${sanitizedFirst[0]}${sanitizedLast}${suffix}@${domain}`,
      `${sanitizedFirst}${sanitizedLast[0]}${suffix}@${domain}`,
    ];
    email = getRandomElement(formats);
    attempts++;
  } while (usedEmails.has(email) && attempts < 100);
  
  usedEmails.add(email);
  return email;
};

const generateUSPhone = (): string => {
  let phone: string;
  let attempts = 0;
  
  do {
    // US format: (XXX) XXX-XXXX
    const areaCode = getRandomNumber(201, 989);
    const exchange = getRandomNumber(200, 999);
    const subscriber = getRandomNumber(1000, 9999);
    phone = `(${areaCode}) ${exchange}-${subscriber}`;
    attempts++;
  } while (usedPhones.has(phone) && attempts < 100);
  
  usedPhones.add(phone);
  return phone;
};

const generateUKPhone = (): string => {
  let phone: string;
  let attempts = 0;
  
  do {
    // UK mobile format: 07XXX XXXXXX
    const prefix = getRandomElement(['7', '74', '75', '77', '78', '79']);
    const remaining = getRandomNumber(100000000, 999999999).toString().slice(0, 9 - prefix.length);
    const fullNumber = `0${prefix}${remaining}`;
    phone = `${fullNumber.slice(0, 5)} ${fullNumber.slice(5)}`;
    attempts++;
  } while (usedPhones.has(phone) && attempts < 100);
  
  usedPhones.add(phone);
  return phone;
};

const generateUSAddress = (): string => {
  const streetNumber = getRandomNumber(1, 9999);
  const street = getRandomElement(usStreets);
  const apt = Math.random() > 0.7 ? `, Apt ${getRandomNumber(1, 500)}` : '';
  const cityData = getRandomElement(usCities);
  const zip = `${cityData.zipPrefix}${getRandomNumber(10, 99)}`;
  
  return `${streetNumber} ${street}${apt}, ${cityData.city}, ${cityData.state} ${zip}, USA`;
};

const generateUKAddress = (): string => {
  const houseNumber = getRandomNumber(1, 200);
  const street = getRandomElement(ukStreets);
  const flat = Math.random() > 0.7 ? `Flat ${getRandomNumber(1, 50)}, ` : '';
  const cityData = getRandomElement(ukCities);
  const postcode = `${cityData.postcodePrefix}${getRandomNumber(1, 20)} ${getRandomNumber(1, 9)}${getRandomElement(['AB', 'CD', 'EF', 'GH', 'JK', 'LM', 'NP', 'QR', 'ST', 'UW'])}`;
  
  return `${flat}${houseNumber} ${street}, ${cityData.city}, ${postcode}, United Kingdom`;
};

export const useRandomUserGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomUser = useCallback((): GeneratedUser => {
    setIsGenerating(true);
    
    const country: 'US' | 'UK' = Math.random() > 0.5 ? 'US' : 'UK';
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = generateUniqueEmail(firstName, lastName);
    const phone = country === 'US' ? generateUSPhone() : generateUKPhone();
    const address = country === 'US' ? generateUSAddress() : generateUKAddress();
    
    setIsGenerating(false);
    
    return { name, email, phone, address, country };
  }, []);

  const clearUsedData = useCallback(() => {
    usedEmails.clear();
    usedPhones.clear();
  }, []);

  return { generateRandomUser, isGenerating, clearUsedData };
};
