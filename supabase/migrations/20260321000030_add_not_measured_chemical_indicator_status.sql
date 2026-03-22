-- Allow sterilization cycles to be recorded when chemical indicator was not measured.
alter type public.sterilization_chemical_indicator_status
  add value if not exists 'not_measured';
