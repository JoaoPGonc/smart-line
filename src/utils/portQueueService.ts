import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PortInfo {
  id: string;
  name: string;
  state: string;
  type: string;
  peakHours: number[]; // Horários de maior movimento estatístico (0-23)
  baseWaitTime: number; // Tempo médio base de espera (minutos)
  coords: { lat: number; lng: number };
}

export const BRAZILIAN_PORTS: PortInfo[] = [
  { id: "santos", name: "Porto de Santos", state: "SP", type: "Multicarga", peakHours: [6, 7, 8, 17, 18], baseWaitTime: 90, coords: { lat: -23.966, lng: -46.300 } },
  { id: "paranagua", name: "Porto de Paranaguá", state: "PR", type: "Granel Sólido", peakHours: [5, 6, 7, 13, 14], baseWaitTime: 120, coords: { lat: -25.508, lng: -48.514 } },
  { id: "itajai", name: "Complexo Portuário de Itajaí/Navegantes", state: "SC", type: "Contêineres", peakHours: [7, 8, 16, 17], baseWaitTime: 60, coords: { lat: -26.906, lng: -48.653 } },
  { id: "riogrande", name: "Porto de Rio Grande", state: "RS", type: "Granel/Contêiner", peakHours: [8, 9, 14, 15], baseWaitTime: 75, coords: { lat: -32.033, lng: -52.091 } },
  { id: "suape", name: "Porto de Suape", state: "PE", type: "Líquidos/Contêiner", peakHours: [7, 8, 17, 18], baseWaitTime: 45, coords: { lat: -8.398, lng: -34.957 } },
  { id: "saofrancisco", name: "Porto de São Francisco do Sul", state: "SC", type: "Granel Sólido", peakHours: [6, 7, 14, 15], baseWaitTime: 80, coords: { lat: -26.241, lng: -48.636 } },
  { id: "tubarao", name: "Porto de Tubarão", state: "ES", type: "Minério/Granel", peakHours: [6, 7, 15, 16], baseWaitTime: 100, coords: { lat: -20.279, lng: -40.239 } },
  { id: "pecem", name: "Porto de Pecém", state: "CE", type: "Granel/Contêiner", peakHours: [6, 7, 16, 17], baseWaitTime: 85, coords: { lat: -3.565, lng: -38.778 } },
  { id: "itaqui", name: "Porto de Itaqui", state: "MA", type: "Granel/Contêiner", peakHours: [5, 6, 14, 15], baseWaitTime: 90, coords: { lat: -2.496, lng: -44.294 } },
  { id: "viladoconde", name: "Porto de Vila do Conde", state: "PA", type: "Contêineres/Granel", peakHours: [6, 7, 15, 16], baseWaitTime: 95, coords: { lat: -1.721, lng: -48.674 } },
  { id: "manaus", name: "Porto de Manaus", state: "AM", type: "Dry Bulk/Contêiner", peakHours: [8, 9, 17, 18], baseWaitTime: 70, coords: { lat: -3.112, lng: -60.035 } },
  { id: "salvador", name: "Porto de Salvador", state: "BA", type: "Contêineres/Líquidos", peakHours: [7, 8, 16, 17], baseWaitTime: 80, coords: { lat: -12.985, lng: -38.516 } },
  { id: "riodejaneiro", name: "Porto do Rio de Janeiro", state: "RJ", type: "Contêineres/Multicarga", peakHours: [8, 9, 17, 18], baseWaitTime: 75, coords: { lat: -22.892, lng: -43.153 } },
  { id: "saosebastiao", name: "Porto de São Sebastião", state: "SP", type: "Contêineres/Granéis", peakHours: [6, 7, 15, 16], baseWaitTime: 85, coords: { lat: -23.858, lng: -45.416 } },
  { id: "imbituba", name: "Porto de Imbituba", state: "SC", type: "Contêineres/Granel", peakHours: [7, 8, 14, 15], baseWaitTime: 70, coords: { lat: -28.246, lng: -48.664 } },
  { id: "vitoria", name: "Porto de Vitória", state: "ES", type: "Minério/Contêiner", peakHours: [6, 7, 16, 17], baseWaitTime: 95, coords: { lat: -20.315, lng: -40.312 } },
  { id: "aratu", name: "Porto de Aratu", state: "BA", type: "Contêineres/Líquidos", peakHours: [6, 7, 15, 16], baseWaitTime: 90, coords: { lat: -12.820, lng: -38.443 } },
  { id: "cabedelo", name: "Porto de Cabedelo", state: "PB", type: "Contêineres/Multicarga", peakHours: [7, 8, 14, 15], baseWaitTime: 65, coords: { lat: -6.975, lng: -34.821 } },
  { id: "maceio", name: "Porto de Maceió", state: "AL", type: "Contêineres/Granel", peakHours: [7, 8, 15, 16], baseWaitTime: 70, coords: { lat: -9.665, lng: -35.729 } },
  { id: "natal", name: "Porto de Natal", state: "RN", type: "Contêineres/Granel", peakHours: [7, 8, 15, 16], baseWaitTime: 70, coords: { lat: -5.771, lng: -35.193 } },
  { id: "saoluis", name: "Porto de São Luís", state: "MA", type: "Granel/Contêiner", peakHours: [6, 7, 14, 15], baseWaitTime: 80, coords: { lat: -2.511, lng: -44.296 } }
];

// Helper to calculate distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export const findClosestPort = (lat: number, lng: number): string => {
  let closestId = BRAZILIAN_PORTS[0].id;
  let minDistance = Infinity;

  BRAZILIAN_PORTS.forEach(port => {
    const dist = getDistanceFromLatLonInKm(lat, lng, port.coords.lat, port.coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestId = port.id;
    }
  });
  return closestId;
};

export type QueueStatus = "livre" | "moderado" | "intenso" | "parado";

export interface QueueReport {
  id?: string;
  portId: string;
  status: QueueStatus;
  timestamp: string;
  reportedByUid: string;
}

// Algoritmo Híbrido: Calcula a estimativa com base no horário + relatos recentes
export const calculateEstimatedWaitTime = (port: PortInfo, recentReports: QueueReport[]): { waitTime: number, trend: "piorando" | "estavel" | "melhorando", label: string, status: QueueStatus } => {
  const currentHour = new Date().getHours();
  const isPeakHour = port.peakHours.includes(currentHour);
  const nextHourIsPeak = port.peakHours.includes((currentHour + 1) % 24);
  
  let trend: "piorando" | "estavel" | "melhorando" = "estavel";
  if (!isPeakHour && nextHourIsPeak) trend = "piorando";
  if (isPeakHour && !nextHourIsPeak) trend = "melhorando";

  // Ajuste base pela hora do dia
  let currentEstimate = port.baseWaitTime;
  if (isPeakHour) currentEstimate *= 1.5;
  if (currentHour >= 22 || currentHour <= 4) currentEstimate *= 0.5; // Madrugada

  // Modificador Colaborativo
  if (recentReports.length > 0) {
    let score = 0;
    recentReports.forEach(r => {
      if (r.status === "livre") score -= 20;
      if (r.status === "moderado") score += 0;
      if (r.status === "intenso") score += 30;
      if (r.status === "parado") score += 60;
    });
    
    const avgScore = score / recentReports.length;
    currentEstimate += avgScore;

    // Ajustar tendência baseado nos ultimos reports
    const latest = recentReports[0].status; // Assumindo ordenado decrescente
    if (latest === "parado" || latest === "intenso") trend = "piorando";
    if (latest === "livre") trend = "melhorando";
  }

  currentEstimate = Math.max(15, Math.round(currentEstimate)); // Minimo 15 mins

  let status: QueueStatus = "livre";
  let label = "Fila Rápida";

  if (currentEstimate > port.baseWaitTime * 1.8) {
    status = "parado";
    label = "Congestionamento Severo";
  } else if (currentEstimate > port.baseWaitTime * 1.2) {
    status = "intenso";
    label = "Trânsito Lento / Fila";
  } else if (currentEstimate > port.baseWaitTime * 0.7) {
    status = "moderado";
    label = "Movimento Normal";
  }

  return { waitTime: currentEstimate, trend, label, status };
};

export const submitQueueReport = async (portId: string, status: QueueStatus, uid: string) => {
  try {
    await addDoc(collection(db, "port_reports"), {
      portId,
      status,
      timestamp: Timestamp.now(),
      reportedByUid: uid
    });
    return true;
  } catch (e) {
    console.error("Erro ao enviar report:", e);
    return false;
  }
};

export const fetchRecentReports = async (portId: string): Promise<QueueReport[]> => {
  try {
    const q = query(
      collection(db, "port_reports"),
      where("portId", "==", portId)
    );
    
    const snap = await getDocs(q);
    const reports: QueueReport[] = [];
    
    const threeHoursAgoMs = Date.now() - 3 * 60 * 60 * 1000;
    
    snap.forEach(doc => {
      const data = doc.data();
      const reportTimeMs = data.timestamp.toDate().getTime();
      
      // Manual filter to bypass composite index requirement
      if (reportTimeMs >= threeHoursAgoMs) {
        reports.push({
          id: doc.id,
          portId: data.portId,
          status: data.status,
          timestamp: data.timestamp.toDate().toISOString(),
          reportedByUid: data.reportedByUid
        });
      }
    });
    
    // Sort descending by time
    return reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error("Erro ao buscar reports:", e);
    return [];
  }
};

export interface PortAppointment {
  portId: string;
  date: string;
  time?: string;
  timestamp: string;
  uid: string;
}

export const logPortAppointment = async (destinationName: string, date: string, time: string, uid: string) => {
  try {
    const destNameLower = destinationName.toLowerCase();
    const port = BRAZILIAN_PORTS.find(p => destNameLower.includes(p.id) || destNameLower.includes(p.name.toLowerCase()));
    
    if (port) {
      const docRef = await addDoc(collection(db, "port_appointments"), {
        portId: port.id,
        date: date,
        time: time,
        timestamp: Timestamp.now(),
        uid: uid
      });
      return docRef.id;
    }
    return null;
  } catch (e) {
    console.error("Erro ao registrar agendamento no porto:", e);
    return null;
  }
};

export const deletePortAppointment = async (docId: string) => {
  try {
    await deleteDoc(doc(db, "port_appointments", docId));
    return true;
  } catch (e) {
    console.error("Erro ao deletar agendamento do porto:", e);
    return false;
  }
};

export const fetchPortAppointments = async (portId: string): Promise<PortAppointment[]> => {
  try {
    const q = query(
      collection(db, "port_appointments"),
      where("portId", "==", portId)
    );
    
    const snap = await getDocs(q);
    const appointments: PortAppointment[] = [];
    
    // Normalize today's date for comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    snap.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date;
      
      let isExpired = false;
      if (dateStr) {
        let year, month, day;
        if (dateStr.includes("-")) {
          [year, month, day] = dateStr.split("-").map(Number);
        } else if (dateStr.includes("/")) {
          [day, month, year] = dateStr.split("/").map(Number);
        }
        
        if (year && month && day) {
          // If the year is 2 digit, assume 20xx
          if (year < 100) year += 2000;
          const appDate = new Date(year, month - 1, day);
          appDate.setHours(0, 0, 0, 0);
          if (appDate.getTime() < now.getTime()) {
            isExpired = true;
          }
        }
      }
      
      if (!isExpired) {
        appointments.push({
          portId: data.portId,
          date: data.date,
          time: data.time || "",
          timestamp: data.timestamp.toDate().toISOString(),
          uid: data.uid
        });
      }
    });
    
    return appointments;
  } catch (e) {
    console.error("Erro ao buscar agendamentos do porto:", e);
    return [];
  }
};
