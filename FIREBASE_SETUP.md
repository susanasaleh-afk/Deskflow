# Firebase Setup Guide - Gig Academy

## Paso 1: Obtener Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `gig-academy`
3. Haz clic en "Configuración del proyecto" (Project Settings) ⚙️
4. En la pestaña "General", desplázate hacia abajo hasta "Tus aplicaciones"
5. Haz clic en la aplicación web o crea una nueva si no existe
6. Copia la configuración de Firebase que aparece (en formato JavaScript)

## Paso 2: Llenar .env.local

Abre el archivo `.env.local` en la raíz del proyecto y completa con tus credenciales:

```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

**⚠️ IMPORTANTE:** 
- `.env.local` está en `.gitignore` - NO se commitará
- Nunca compartas estas credenciales
- Cada desarrollador necesita su propio `.env.local`

## Paso 3: Instalar Dependencias

```bash
npm install
```

## Paso 4: Verificar la Configuración

Crea un archivo `test-firebase.js` para verificar la conexión:

```javascript
import app, { db, auth } from './firebase-config.js';
import { collection, getDocs } from 'firebase/firestore';

async function testConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log(`✅ Conexión a Firebase exitosa! (${querySnapshot.size} usuarios)`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();
```

Ejecuta: `node test-firebase.js`

## Paso 5: Usar Firebase en tu Código

### Opción 1: Usar funciones helper (Recomendado)

```javascript
import { getUser, createBooking, getUserBookings } from './firestore-utils.js';

// Obtener usuario
const user = await getUser('user-id');

// Crear reserva
const bookingId = await createBooking({
  userId: 'user-123',
  deskId: 'desk-456',
  date: new Date('2024-08-15'),
});

// Obtener reservas del usuario
const bookings = await getUserBookings('user-123');
```

### Opción 2: Usar Firebase directamente

```javascript
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Agregar documento
const docRef = await addDoc(collection(db, 'bookings'), {
  userId: 'user-123',
  deskId: 'desk-456',
  date: new Date(),
});

// Consultar documentos
const q = query(collection(db, 'users'), where('officeId', '==', 'office-1'));
const querySnapshot = await getDocs(q);
```

## Estructura de Colecciones Recomendada

```
Firestore
├── users/
│   ├── user-123
│   │   ├── email: "user@example.com"
│   │   ├── name: "John Doe"
│   │   ├── officeId: "office-1"
│   │   └── createdAt: timestamp
│   └── user-456
│
├── bookings/
│   ├── booking-1
│   │   ├── userId: "user-123"
│   │   ├── deskId: "desk-456"
│   │   ├── date: date
│   │   ├── status: "active" | "cancelled"
│   │   └── createdAt: timestamp
│   └── booking-2
│
├── desks/
│   ├── desk-456
│   │   ├── name: "A1"
│   │   ├── officeId: "office-1"
│   │   ├── type: "standard" | "fixed"
│   │   └── status: "available" | "booked"
│   └── desk-789
│
├── offices/
│   ├── office-1
│   │   ├── name: "NYC - Times Square"
│   │   ├── address: "..."
│   │   └── capacity: 50
│   └── office-2
│
└── checkins/
    ├── checkin-1
    │   ├── userId: "user-123"
    │   ├── bookingId: "booking-1"
    │   ├── deskId: "desk-456"
    │   ├── timestamp: timestamp
    │   └── method: "qr" | "manual"
```

## Configurar Firestore (si aún no lo has hecho)

1. En Firebase Console, ve a **Firestore Database**
2. Haz clic en **Create Database**
3. Selecciona **Start in test mode** (para desarrollo)
4. Selecciona la región más cercana
5. Una vez creado, actualiza las reglas de seguridad en la pestaña **Rules**:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Development rules - CAMBIAR EN PRODUCCIÓN
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Solución de Problemas

### Error: "FIREBASE_API_KEY is not defined"
- Verifica que `.env.local` tiene todas las variables
- Reinicia el servidor de desarrollo

### Error: "Permission denied"
- Comprueba las Firestore Security Rules
- En desarrollo, usa "test mode"

### Error: "Project does not exist"
- Verifica el `VITE_FIREBASE_PROJECT_ID`
- Asegúrate de que la aplicación está registrada en Firebase Console

## Referencia

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Auth](https://firebase.google.com/docs/auth)
