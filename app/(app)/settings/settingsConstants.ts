import type { SelectGroup, SelectOption } from '@/components/Select';

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'ARS', label: 'Peso argentino',        hint: 'ARS' },
  { value: 'USD', label: 'Dólar estadounidense',  hint: 'USD' },
  { value: 'EUR', label: 'Euro',                  hint: 'EUR' },
  { value: 'MXN', label: 'Peso mexicano',         hint: 'MXN' },
  { value: 'CLP', label: 'Peso chileno',          hint: 'CLP' },
  { value: 'COP', label: 'Peso colombiano',       hint: 'COP' },
];

export const TIMEZONE_GROUPS: SelectGroup[] = [
  {
    label: 'América del Sur',
    options: [
      { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires',   hint: 'GMT-3' },
      { value: 'America/Argentina/Cordoba',      label: 'Córdoba',        hint: 'GMT-3' },
      { value: 'America/Argentina/Mendoza',      label: 'Mendoza',        hint: 'GMT-3' },
      { value: 'America/Argentina/Ushuaia',      label: 'Ushuaia',        hint: 'GMT-3' },
      { value: 'America/Montevideo',             label: 'Montevideo',     hint: 'GMT-3' },
      { value: 'America/Asuncion',               label: 'Asunción',       hint: 'GMT-3/-4' },
      { value: 'America/Sao_Paulo',              label: 'São Paulo',      hint: 'GMT-3' },
      { value: 'America/La_Paz',                 label: 'La Paz',         hint: 'GMT-4' },
      { value: 'America/Santiago',               label: 'Santiago',       hint: 'GMT-4/-3' },
      { value: 'America/Caracas',                label: 'Caracas',        hint: 'GMT-4' },
      { value: 'America/Bogota',                 label: 'Bogotá',         hint: 'GMT-5' },
      { value: 'America/Lima',                   label: 'Lima',           hint: 'GMT-5' },
      { value: 'America/Guayaquil',              label: 'Quito',          hint: 'GMT-5' },
    ],
  },
  {
    label: 'América del Norte y Central',
    options: [
      { value: 'America/Mexico_City',     label: 'Ciudad de México', hint: 'GMT-6' },
      { value: 'America/Guatemala',       label: 'Guatemala',         hint: 'GMT-6' },
      { value: 'America/San_Salvador',    label: 'San Salvador',      hint: 'GMT-6' },
      { value: 'America/Tegucigalpa',     label: 'Tegucigalpa',       hint: 'GMT-6' },
      { value: 'America/Managua',         label: 'Managua',           hint: 'GMT-6' },
      { value: 'America/Costa_Rica',      label: 'San José',          hint: 'GMT-6' },
      { value: 'America/Panama',          label: 'Panamá',            hint: 'GMT-5' },
      { value: 'America/Havana',          label: 'La Habana',         hint: 'GMT-5' },
      { value: 'America/Santo_Domingo',   label: 'Santo Domingo',     hint: 'GMT-4' },
      { value: 'America/Puerto_Rico',     label: 'San Juan',          hint: 'GMT-4' },
      { value: 'America/New_York',        label: 'Nueva York',        hint: 'GMT-5' },
      { value: 'America/Chicago',         label: 'Chicago',           hint: 'GMT-6' },
      { value: 'America/Denver',          label: 'Denver',            hint: 'GMT-7' },
      { value: 'America/Los_Angeles',     label: 'Los Ángeles',       hint: 'GMT-8' },
    ],
  },
  {
    label: 'Europa',
    options: [
      { value: 'Europe/London',    label: 'Londres',   hint: 'GMT+0/+1' },
      { value: 'Europe/Madrid',    label: 'Madrid',    hint: 'GMT+1' },
      { value: 'Europe/Paris',     label: 'París',     hint: 'GMT+1' },
      { value: 'Europe/Berlin',    label: 'Berlín',    hint: 'GMT+1' },
      { value: 'Europe/Rome',      label: 'Roma',      hint: 'GMT+1' },
      { value: 'Europe/Lisbon',    label: 'Lisboa',    hint: 'GMT+0' },
      { value: 'Europe/Amsterdam', label: 'Ámsterdam', hint: 'GMT+1' },
      { value: 'Europe/Brussels',  label: 'Bruselas',  hint: 'GMT+1' },
      { value: 'Europe/Zurich',    label: 'Zúrich',    hint: 'GMT+1' },
      { value: 'Europe/Athens',    label: 'Atenas',    hint: 'GMT+2' },
    ],
  },
  {
    label: 'Resto del mundo',
    options: [
      { value: 'UTC',              label: 'UTC',       hint: 'GMT+0' },
      { value: 'Asia/Tokyo',       label: 'Tokio',     hint: 'GMT+9' },
      { value: 'Asia/Shanghai',    label: 'Shanghai',  hint: 'GMT+8' },
      { value: 'Asia/Singapore',   label: 'Singapur',  hint: 'GMT+8' },
      { value: 'Asia/Dubai',       label: 'Dubái',     hint: 'GMT+4' },
      { value: 'Australia/Sydney', label: 'Sídney',    hint: 'GMT+10/+11' },
    ],
  },
];
