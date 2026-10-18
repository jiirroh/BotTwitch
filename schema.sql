-- Create the schedule table
CREATE TABLE IF NOT EXISTS public.schedule (
    day_id VARCHAR(20) PRIMARY KEY, -- e.g., 'monday', 'tuesday'
    title VARCHAR(255) NOT NULL,
    start_time VARCHAR(10) NOT NULL, -- e.g., '20:00'
    image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default days if not exists
INSERT INTO public.schedule (day_id, title, start_time, image_url)
VALUES 
    ('monday', 'OFF', '-', null),
    ('tuesday', 'OFF', '-', null),
    ('wednesday', 'OFF', '-', null),
    ('thursday', 'OFF', '-', null),
    ('friday', 'OFF', '-', null),
    ('saturday', 'OFF', '-', null),
    ('sunday', 'OFF', '-', null)
ON CONFLICT (day_id) DO NOTHING;

-- Create config table to store discord message IDs (like the public schedule message ID)
CREATE TABLE IF NOT EXISTS public.config (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
