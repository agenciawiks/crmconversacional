import { supabase } from '../supabase';

export const fetchAppointments = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, contacts (name, phone)')
    .order('start_time', { ascending: true });
    
  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
  return data || [];
};

export const createAppointment = async (appointmentData) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
  return data;
};

export const updateAppointment = async (id, updates) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
  return data;
};

// Soft delete
export const cancelAppointment = async (id) => {
  return await updateAppointment(id, { status: 'cancelled' });
};

export const fetchAgendaSettings = async () => {
  const { data, error } = await supabase
    .from('crm_settings')
    .select('value')
    .eq('key', 'agenda_settings')
    .single();
    
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching agenda settings:', error);
    return null;
  }
  
  if (data && data.value) {
    try {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    } catch (e) {
      console.error('Error parsing agenda settings:', e);
    }
  }
  
  // Default fallback settings
  return {
    working_hours: { start: '09:00', end: '18:00' },
    days: [1, 2, 3, 4, 5],
    slot_duration_minutes: 60
  };
};

export const updateAgendaSettings = async (settings) => {
  const { data, error } = await supabase
    .from('crm_settings')
    .upsert({ key: 'agenda_settings', value: JSON.stringify(settings) }, { onConflict: 'key' })
    .select()
    .single();
    
  if (error) {
    console.error('Error updating agenda settings:', error);
    throw error;
  }
  return data;
};
