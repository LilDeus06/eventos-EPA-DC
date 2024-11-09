'use client'

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Plus, Trash2, Moon, Sun } from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Configuración de Firebase (reemplaza con tus propias credenciales)
const firebaseConfig = {
  apiKey: "AIzaSyDW1oEwM8ul_pPBgLAzr67UPIJPv5a9k-c",
  authDomain: "calendarioeventos-3b1ef.firebaseapp.com",
  databaseURL: "https://calendarioeventos-3b1ef-default-rtdb.firebaseio.com",
  projectId: "calendarioeventos-3b1ef",
  storageBucket: "calendarioeventos-3b1ef.firebasestorage.app",
  messagingSenderId: "115865009402",
  appId: "1:115865009402:web:248e8dc23d7051e5435d43",
  measurementId: "G-F4Y9PKJWR0"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Reservacion {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'ocupado' | 'disponible' | 'enReunion';
  color?: string;
}

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setIsLoggedIn] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setIsLoggedIn(true);
        setIsDialogOpen(false);
      } 
    });

    return () => unsubscribe();
  }, [auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
      alert('Inicio de sesión exitoso');
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError("Error Desconocido al iniciar sesión: ");
      alert('Error al iniciar sesión');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">Iniciar Sesión</Button>
      </DialogTrigger>
      <DialogContent className='py-10'>
        <DialogHeader>
          <DialogTitle>Iniciar Sesión</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin}>
          {error && <div className="text-red-500">{error}</div>}
          <Input 
            className="h-10 mb-4"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            className="h-10 mb-4"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit">Iniciar Sesión</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function Home() {
  const [reservaciones, setReservaciones] = useState<Reservacion[]>([]);
  const [semanaActual, setSemanaActual] = useState(new Date());
  const [reservacionSeleccionada, setReservacionSeleccionada] = useState<Reservacion | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'disponible' as 'ocupado' | 'disponible' | 'enReunion'
  });
  const [modoEdicion, setModoEdicion] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Verificar si estamos en el navegador antes de acceder a localStorage
    if (typeof window !== 'undefined') {
      const preferenciaModoOscuro = localStorage.getItem('modoOscuro');
      if (preferenciaModoOscuro !== null) {
        setModoOscuro(JSON.parse(preferenciaModoOscuro));
      }
    }
    cargarReservaciones();
  }, []);

  const toggleModoOscuro = () => {
    const nuevoModoOscuro = !modoOscuro;
    setModoOscuro(nuevoModoOscuro);
    
    // Verificar si estamos en el navegador antes de usar localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('modoOscuro', JSON.stringify(nuevoModoOscuro));
    }
  };

  const cargarReservaciones = async () => {
    const reservacionesCol = collection(db, 'reservaciones');
    const reservacionesSnapshot = await getDocs(reservacionesCol);
    const listaReservaciones = reservacionesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Reservacion[];
    setReservaciones(listaReservaciones);
  };

  const agregarReservacion = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const nuevaFechaInicio = new Date(formData.fechaInicio);
    const nuevaFechaFin = new Date(formData.fechaFin);
  
    const hayConflicto = reservaciones.some(reservacion => {
      const fechaInicioExistente = new Date(reservacion.fechaInicio);
      const fechaFinExistente = new Date(reservacion.fechaFin);
      return (nuevaFechaInicio < fechaFinExistente && nuevaFechaFin > fechaInicioExistente);
    });
  
    if (hayConflicto) {
      alert('Las horas seleccionadas se cruzan con otra reservación existente.');
      return;
    }
  
    try {
      const colorAleatorio = obtenerColorAleatorio(); // Obtener color aleatorio
      if (modoEdicion && reservacionSeleccionada) {
        await updateDoc(doc(db, 'reservaciones', reservacionSeleccionada.id), { ...formData, color: colorAleatorio });
        alert('Reservación actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'reservaciones'), { ...formData, color: colorAleatorio });
        alert('Reservación creada exitosamente');
      }
      await cargarReservaciones();
      limpiarFormulario();
    } catch (error) {
      alert('Error al guardar la reservación');
      console.error(error);
    }
  };

  const eliminarReservacion = async (id: string) => {
    if (!isLoggedIn) {
      alert("Debes iniciar sesión para eliminar una reservación.");
      return;
    }
    await deleteDoc(doc(db, 'reservaciones', id));
    await cargarReservaciones();
    alert('Reservación eliminada exitosamente');
  };

  const limpiarFormulario = () => {
    setFormData({
      titulo: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'disponible'
    });
    setModoEdicion(false);
    setReservacionSeleccionada(null);
  };

  const editarReservacion = (reservacion: Reservacion) => {
    setFormData({
      titulo: reservacion.titulo,
      fechaInicio: reservacion.fechaInicio,
      fechaFin: reservacion.fechaFin,
      estado: reservacion.estado
    });
    setModoEdicion(true);
    setReservacionSeleccionada(reservacion);
  };

  const obtenerFechasSemana = (fecha: Date) => {
    const inicio = startOfWeek(fecha, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  };

  const diasSemana = obtenerFechasSemana(semanaActual);

  const obtenerColorEstado = (estado: 'ocupado' | 'disponible' | 'enReunion') => {
    switch (estado) {
      case 'ocupado':
        return 'bg-red-500';
      case 'disponible':
        return 'bg-green-500';
      case 'enReunion':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const obtenerColorAleatorio = () => {
    const coloresSuaves = [
      'bg-blue-200',
      'bg-green-200',
      'bg-yellow-200',
      'bg-red-200',
      'bg-purple-200',
      'bg-pink-200',
      'bg-indigo-200',
      'bg-teal-200'
    ];
    return coloresSuaves[Math.floor(Math.random() * coloresSuaves.length)];
  };

  const navegarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(semanaActual);
    if (direccion === 'anterior') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    } else {
      nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    }
    setSemanaActual(nuevaFecha);
  };

  return (
    <main 
      className={`
        min-h-screen pt-20 pl-20 pr-20
        ${modoOscuro ? 'bg-gray-900 text-white' : 'bg-white text-black'}
        transition-colors 
        duration-300 
        ease-in-out
        p-4
      `}
    >
      <Card 
        className={`
          w-full 
          max-w-full 
          mx-auto 
          ${modoOscuro ? 'bg-gray-800 border-gray-700' : 'bg-white'}
        `}
      >
        <CardHeader 
          className={`
            ${modoOscuro ? 'bg-gray-700 text-white' : 'bg-gray-100'}
          `}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl mb-4 sm:mb-0">
              Reservación de Reuniones SAFCO
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Login onLoginSuccess={() => setIsLoggedIn(true)} />
              <Button 
                onClick={toggleModoOscuro} 
                variant="outline"
                className={`
                  ${modoOscuro 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-white text-black hover:bg-gray-100'
                  }
                `}
              >
                {modoOscuro ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
                {modoOscuro ? 'Modo Claro' : 'Modo Oscuro'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                <Button
                    className="bg-red-600 hover:bg-red-700 ml-2"
                    
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{modoEdicion ? 'Editar Reservación ' : 'Nueva Reservación'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={agregarReservacion} className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="titulo">Título</Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicio">Fecha y hora de inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="datetime-local"
                        value={formData.fechaInicio}
                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fechaFin">Fecha y hora de fin</Label>
                      <Input
                        id="fechaFin"
                        type="datetime-local"
                        value={formData.fechaFin}
                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value: 'ocupado' | 'disponible' | 'enReunion') => setFormData({ ...formData, estado: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="ocupado">Ocupado</SelectItem>
                          <SelectItem value="enReunion">En Reunión</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={limpiarFormulario}>
                        Limpiar
                      </Button>
                      <Button type="submit">
                        {modoEdicion ? 'Actualizar' : 'Guardar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navegarSemana('anterior')}>
                <ChevronLeft className="h-4 w-4 text-black" />
              </Button>
              <Button variant="outline" onClick={() => navegarSemana('siguiente')}>
                <ChevronRight className="h-4 w-4 text-black" />
              </Button>
              <Button variant="secondary" onClick={() => setSemanaActual(new Date())}>Hoy</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent 
          className={`
            ${modoOscuro ? 'bg-gray-800' : 'bg-white'}
          `}
        >
          <div className="overflow-x-auto pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
              {diasSemana.map((dia, index) => (
                <div 
                  key={index} 
                  className={`
                    border 
                    rounded-lg 
                    p-3 
                    ${modoOscuro 
                      ? 'bg-gray-700 border-gray-600 text-white'  // Forzando el texto en negro en modo oscuro
                      : 'bg-gray-100 text-black'  // También en modo claro
                    }
                  `}
                >
                  <div className="font-semibold mb-2 text-sm sm:text-base">
                    {format(dia, 'EEEE d', { locale: es })}
                  </div>
                  <div className="space-y-2">
                    {reservaciones
                      .filter(res => isSameDay(new Date(res.fechaInicio), dia))
                      .map(reservacion => (
                        <div
                          key={reservacion.id}
                          className={`
                            p-2 rounded-lg 
                            ${reservacionSeleccionada?.id === reservacion.id ? 'border-2 border-blue-500' : ''} 
                            ${reservacion.color || obtenerColorEstado(reservacion.estado)}
                          `}
                          onClick={() => editarReservacion(reservacion)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${obtenerColorEstado(reservacion.estado)}`} />
                              <span><span className="text-black">{format(new Date(reservacion.fechaInicio), 'HH:mm')} - {format(new Date(reservacion.fechaFin), 'HH:mm')}</span> {/* Texto del evento siempre en negro */}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarReservacion(reservacion.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-black" />  {/* Icono en negro */}
                            </Button>
                          </div>
                          <div className="font-medium text-gray-600">{reservacion.titulo}</div>
                        </div>
                      ))}
                    {reservaciones.filter(res => isSameDay(new Date(res.fechaInicio), dia)).length === 0 && (
                      <div className="text-gray-500 text-sm">No hay reservaciones para este día.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
  
      {/* Firma sutil */}
      <footer className="text-center mt-8 text-gray-500 text-xs">
        &copy; Desarrollado por L I L - D.
      </footer>
    </main>
  );
  
  
}
