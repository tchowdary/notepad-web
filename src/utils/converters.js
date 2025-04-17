import CryptoJS from 'crypto-js';
import * as asn1js from 'asn1js';
import { Certificate } from 'pkijs';

// Utility functions for consistent base64 encoding/decoding with UTF-8 support
export const base64Utils = {
  // Encode string to base64 with proper UTF-8 handling
  encodeToBase64: (text) => {
    if (!text) return '';
    return btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
  },
  
  // Decode base64 to string with proper UTF-8 handling
  decodeFromBase64: (base64Text) => {
    if (!base64Text) return '';
    
    try {
      // Modern approach using Array.from for proper UTF-8 handling
      return decodeURIComponent(Array.from(atob(base64Text), c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
    } catch (error) {
      console.error('Error decoding base64 content:', error);
      // Fallback to the previous method if the new one fails
      try {
        return decodeURIComponent(escape(atob(base64Text)));
      } catch (fallbackError) {
        console.error('Fallback decoding also failed:', fallbackError);
        // Last resort - just return the raw decoded content
        return atob(base64Text);
      }
    }
  }
};

export const converters = {
  timestamp: {
    name: 'Timestamp to Date',
    convert: function(input) {
      const timestamps = input.match(/\d+/g);
      if (!timestamps) {
        throw new Error("No timestamps found in the text. Please enter a number like 1699893347 or 1699893347000");
      }

      let results = [];
      let validCount = 0;
      for (const ts of timestamps) {
        try {
          const timestamp = parseInt(ts);
          if (isNaN(timestamp)) continue;

          if (timestamp < 1000000000 || timestamp > 9999999999999) continue;

          let dates = [];
          if (ts.length >= 13) {
            const msDate = new Date(timestamp);
            if (msDate.getTime() > 0 && msDate.getFullYear() > 1970 && msDate.getFullYear() < 2100) {
              dates.push({ format: "milliseconds", date: msDate });
            }
          }
          const secsDate = new Date(timestamp * 1000);
          if (secsDate.getTime() > 0 && secsDate.getFullYear() > 1970 && secsDate.getFullYear() < 2100) {
            dates.push({ format: "seconds", date: secsDate });
          }

          if (dates.length > 0) {
            validCount++;
            results.push(`\nTimestamp: ${ts}`);
            dates.forEach(({format, date}) => {
              results.push(`Format: ${format}`);
              results.push(`UTC: ${date.toUTCString()}`);
              results.push(`Local: ${date.toString()}`);
            });
            results.push("---");
          }
        } catch (e) {
          continue;
        }
      }

      if (validCount === 0) {
        throw new Error("No valid timestamps found. Please enter a Unix timestamp (e.g., 1699893347 or 1699893347000)");
      }

      return results.join('\n');
    }
  },
  textFormatConverter: {
    name: 'Text Format Converter',
    convert: function(input) {
      try {
        // Helper functions to detect format
        const isHex = str => {
          const cleanStr = str.trim();
          const parts = cleanStr.split(/\s+/);
          return parts.every(part => /^0x[0-9A-Fa-f]{2}$/.test(part));
        };
        const isBase64 = str => {
          try {
            return btoa(atob(str)) === str;
          } catch {
            return false;
          }
        };

        // Helper functions for conversion
        const hexToBytes = hex => {
          const cleanHex = hex.replace(/0x/g, '').replace(/\s/g, '');
          const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
          return bytes;
        };

        const bytesToHex = bytes => 
          Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

        const bytesToBase64 = bytes => {
          let binary = '';
          bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
          });
          return btoa(binary);
        };

        const base64ToBytes = b64 => {
          const binary = atob(b64);
          return new Uint8Array(Array.from(binary).map(char => char.charCodeAt(0)));
        };

        // Detect input format
        const cleanInput = input.trim();
        let inputFormat = 'text';
        let bytes;

        if (isHex(cleanInput)) {
          inputFormat = 'hex';
          bytes = hexToBytes(cleanInput);
          return [
            '# Input Format: Hex',
            cleanInput,
            '',
            '# Base64 Output:',
            bytesToBase64(bytes)
          ].join('\n');
        } else if (isBase64(cleanInput)) {
          inputFormat = 'base64';
          bytes = base64ToBytes(cleanInput);
          return [
            '# Input Format: Base64',
            cleanInput,
            '',
            '# Hex Output:',
            bytesToHex(bytes),
            '',
            '# Text Output:',
            new TextDecoder().decode(bytes)
          ].join('\n');
        } else {
          bytes = new TextEncoder().encode(cleanInput);
          return [
            '# Input Format: Text',
            cleanInput,
            '',
            '# Hex Output:',
            bytesToHex(bytes),
            '',
            '# Base64 Output:',
            bytesToBase64(bytes)
          ].join('\n');
        }
      } catch (error) {
        throw new Error(`Conversion failed: ${error.message}`);
      }
    }
  },
  jsonToCsv: {
    name: 'JSON to CSV',
    convert: function(input) {
      try {
        const json = JSON.parse(input);
        const data = Array.isArray(json) ? json : (json.people || Object.values(json)[0]);
        
        if (!Array.isArray(data)) {
          throw new Error("Input must contain an array of objects");
        }
        if (data.length === 0) {
          throw new Error("Input array is empty");
        }

        function flattenObject(obj, prefix = '') {
          return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (value === null) {
              acc[newKey] = 'null';
            } else if (Array.isArray(value)) {
              acc[newKey] = JSON.stringify(value);
            } else if (typeof value === 'object') {
              Object.assign(acc, flattenObject(value, newKey));
            } else {
              acc[newKey] = value;
            }
            
            return acc;
          }, {});
        }

        const flattenedData = data.map(item => flattenObject(item));
        const headers = [...new Set(
          flattenedData.reduce((acc, item) => [...acc, ...Object.keys(item)], [])
        )].sort();

        const csvRows = [headers.join(',')];
        
        for (const row of flattenedData) {
          const values = headers.map(header => {
            const val = row[header] ?? '';
            if (typeof val === 'string') {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
          });
          csvRows.push(values.join(','));
        }

        return `CSV Output:\n${csvRows.join('\n')}`;
      } catch (error) {
        throw new Error(`JSON to CSV conversion failed: ${error.message}`);
      }
    }
  },
  jwt: {
    name: 'JWT Parser',
    convert: function(input) {
      try {
        const jwt = input.trim();
        if (!jwt) {
          throw new Error('Empty JWT token');
        }

        const [headerB64, payloadB64] = jwt.split('.');
        if (!headerB64 || !payloadB64) {
          throw new Error('Invalid JWT format');
        }
        
        const header = JSON.parse(atob(headerB64));
        const payload = JSON.parse(atob(payloadB64));

        return `JWT Header:\n${JSON.stringify(header, null, 2)}\n\nJWT Payload:\n${JSON.stringify(payload, null, 2)}`;
      } catch (e) {
        throw new Error('Invalid JWT format: ' + e.message);
      }
    }
  },
  certDecoder: {
    name: 'Certificate Decoder',
    convert: function(input) {
      try {
        // Helper function to check if string is base64
        const isBase64 = str => {
          try {
            const cleaned = str.trim().replace(/[\r\n\s]/g, '');
            return /^[A-Za-z0-9+/]*={0,2}$/.test(cleaned);
          } catch {
            return false;
          }
        };

        // Helper function to convert WordArray to Uint8Array
        const wordArrayToUint8Array = (wordArray) => {
          const words = wordArray.words;
          const sigBytes = wordArray.sigBytes;
          const u8 = new Uint8Array(sigBytes);
          for (let i = 0; i < sigBytes; i++) {
            const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            u8[i] = byte;
          }
          return u8;
        };

        // Handle /n in the input and clean it
        let cleanInput = input.replace(/\\n/g, '\n').trim();
        let pemContent;
        let base64Content;

        // Check if input is base64 encoded certificate
        if (isBase64(cleanInput)) {
          // First decode the base64 to get the PEM certificate
          const decoded = atob(cleanInput);
          
          // Now we have the PEM certificate
          if (!decoded.includes('-----BEGIN CERTIFICATE-----') || !decoded.includes('-----END CERTIFICATE-----')) {
            throw new Error('Invalid certificate format after base64 decode. Must contain PEM markers.');
          }
          
          pemContent = decoded;
          base64Content = cleanInput;
        } else {
          // Check if it's a PEM certificate
          if (!cleanInput.includes('-----BEGIN CERTIFICATE-----') || !cleanInput.includes('-----END CERTIFICATE-----')) {
            throw new Error('Invalid certificate format. Must be a PEM or base64 encoded certificate.');
          }
          
          pemContent = cleanInput;
          // Extract the base64 content between the BEGIN and END markers and encode the whole PEM
          base64Content = btoa(cleanInput);
        }

        // Extract the pure base64 content for parsing
        const parseContent = pemContent
          .replace('-----BEGIN CERTIFICATE-----', '')
          .replace('-----END CERTIFICATE-----', '')
          .replace(/[\r\n\s]/g, '');

        // Decode the base64 content
        const binaryString = CryptoJS.enc.Base64.parse(parseContent);
        const binaryData = wordArrayToUint8Array(binaryString);

        // Parse the ASN.1 structure
        const asn1 = asn1js.fromBER(binaryData.buffer);
        if (asn1.offset === -1) {
          throw new Error('Invalid ASN.1 structure. The input may not be a valid certificate.');
        }

        // Parse the certificate
        const certificate = new Certificate({ schema: asn1.result });

        // Map OIDs to readable names
        const oidMap = {
          '2.5.4.3': 'Common Name',
          '2.5.4.6': 'Country',
          '2.5.4.7': 'Locality',
          '2.5.4.8': 'State',
          '2.5.4.10': 'Organization',
          '2.5.4.11': 'Organization Unit',
          '2.5.29.17': 'Subject Alternative Names'
        };

        // Extract subject information
        const subjectInfo = {};
        certificate.subject.typesAndValues.forEach(tv => {
          const fieldName = oidMap[tv.type] || tv.type;
          subjectInfo[fieldName] = tv.value.valueBlock.value;
        });

        // Extract issuer information
        const issuerInfo = {};
        certificate.issuer.typesAndValues.forEach(tv => {
          const fieldName = oidMap[tv.type] || tv.type;
          issuerInfo[fieldName] = tv.value.valueBlock.value;
        });

        // Format dates
        const formatDate = (date) => {
          return date.toLocaleDateString('en-US', { 
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
        };

        // Calculate key size (in bits)
        const keySize = certificate.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHex.byteLength * 8;

        // Build the formatted output
        let output = '# Certificate Information:\n';
        
        // Add subject information
        if (subjectInfo['Common Name']) output += `Common Name: ${subjectInfo['Common Name']}\n`;
        if (subjectInfo['Subject Alternative Names']) output += `Subject Alternative Names: ${subjectInfo['Subject Alternative Names']}\n`;
        if (subjectInfo['Organization']) output += `Organization: ${subjectInfo['Organization']}\n`;
        if (subjectInfo['Organization Unit']) output += `Organization Unit: ${subjectInfo['Organization Unit']}\n`;
        if (subjectInfo['Locality']) output += `Locality: ${subjectInfo['Locality']}\n`;
        if (subjectInfo['State']) output += `State: ${subjectInfo['State']}\n`;
        if (subjectInfo['Country']) output += `Country: ${subjectInfo['Country']}\n`;
        
        // Add validity period
        output += `Valid From: ${formatDate(certificate.notBefore.value)}\n`;
        output += `Valid To: ${formatDate(certificate.notAfter.value)}\n`;
        
        // Add issuer
        const issuerName = issuerInfo['Common Name'] || Object.values(issuerInfo)[0];
        output += `Issuer: ${issuerName}\n`;
        
        // Add key size and serial number
        output += `Key Size: ${keySize} bit\n`;
        output += `Serial Number: ${certificate.serialNumber.valueBlock.toString()}\n`;

        output += '\n# Formatted Certificate:\n';
        output += pemContent;

        output += '\n\n# Base64 Encoded Certificate:\n';
        output += base64Content;

        return output;
      } catch (error) {
        throw new Error(`Certificate decoding failed: ${error.message}`);
      }
    }
  },
  upperCaseConverter: {
    name: 'Convert to Uppercase',
    convert: function(input) {
      if (!input || typeof input !== 'string') {
        throw new Error('Please provide text to convert');
      }
      return input.toUpperCase();
    }
  },
  lowerCaseConverter: {
    name: 'Convert to Lowercase',
    convert(input) {
      return input.toLowerCase();
    }
  },
  sqlStringConverter: {
    name: 'Format as SQL Strings',
    convert(input) {
      if (!input.trim()) {
        throw new Error("Please enter some text to convert");
      }

      // Split input by newlines and filter out empty lines
      const lines = input.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Process each line
      const processedLines = lines.map(line => {
        // Remove any existing quotes (both single and double)
        const cleanLine = line.replace(/['",]/g, '');
        // Wrap in single quotes
        return `'${cleanLine}'`;
      });

      // Join with commas
      return processedLines.join(',');
    }
  }
};
