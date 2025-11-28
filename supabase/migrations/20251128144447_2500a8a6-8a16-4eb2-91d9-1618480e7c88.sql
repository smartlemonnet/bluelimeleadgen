-- Add list_id column to contacts table
ALTER TABLE public.contacts ADD COLUMN list_id UUID REFERENCES validation_lists(id);

-- Create index for better query performance
CREATE INDEX idx_contacts_list_id ON public.contacts(list_id);