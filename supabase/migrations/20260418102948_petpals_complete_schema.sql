-- ==========================================
-- 1. CORE USERS & PROFILES
-- ==========================================
CREATE TABLE profiles (
                          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
                          user_name TEXT NOT NULL,
                          email TEXT,
                          phone_number TEXT,
                          user_type TEXT CHECK (user_type IN ('Adopter', 'Clinic', 'Shelter', 'Admin'))
);

CREATE TABLE shelter_profiles (
                                  shelter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
                                  org_name TEXT NOT NULL,
                                  license_number TEXT,
                                  is_verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE adopter_profiles (
                                  adopter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
                                  housing_type TEXT,
                                  has_other_pets BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- 2. CLINIC & APPOINTMENTS
-- ==========================================
CREATE TABLE clinics (
                         clinic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                         name TEXT NOT NULL,
                         location TEXT,
                         phone TEXT
);

CREATE TABLE appointments (
                              appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
                              clinic_id UUID REFERENCES clinics(clinic_id) ON DELETE CASCADE,
                              appointment_date TIMESTAMPTZ NOT NULL,
                              reason TEXT,
                              status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled'))
);

-- ==========================================
-- 3. PETS, COLLARS & ADOPTION
-- ==========================================
CREATE TABLE pets (
                      pet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                      shelter_id UUID REFERENCES shelter_profiles(shelter_id) ON DELETE CASCADE,
                      name TEXT NOT NULL,
                      breed TEXT,
                      age INTEGER,
                      status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Pending', 'Adopted', 'In Treatment')),
                      medical_history TEXT
);

CREATE TABLE smart_collars (
                               collar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                               pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
                               serial_number TEXT UNIQUE NOT NULL,
                               last_sync_time TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applications (
                              application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              pet_id UUID REFERENCES pets(pet_id) ON DELETE CASCADE,
                              adopter_id UUID REFERENCES adopter_profiles(adopter_id) ON DELETE CASCADE,
                              submission_date TIMESTAMPTZ DEFAULT now(),
                              status TEXT DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Approved', 'Rejected')),
                              match_score INTEGER
);

-- ==========================================
-- 4. E-COMMERCE (PRODUCTS & ORDERS)
-- ==========================================
CREATE TABLE products (
                          product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          name TEXT NOT NULL,
                          price DECIMAL(10, 2) NOT NULL,
                          stock_level INTEGER DEFAULT 0,
                          category TEXT
);

CREATE TABLE orders (
                        order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
                        order_date TIMESTAMPTZ DEFAULT now(),
                        total_amount DECIMAL(10, 2),
                        status TEXT DEFAULT 'Processing' CHECK (status IN ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
                        shipping_address TEXT,
                        payment_method TEXT
);

CREATE TABLE order_items (
                             order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                             order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
                             product_id UUID REFERENCES products(product_id) ON DELETE CASCADE,
                             quantity INTEGER NOT NULL,
                             sub_total DECIMAL(10, 2) NOT NULL
);

-- ==========================================
-- 5. DONATIONS & CAMPAIGNS
-- ==========================================
CREATE TABLE campaigns (
                           campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           shelter_id UUID REFERENCES shelter_profiles(shelter_id) ON DELETE CASCADE,
                           title TEXT NOT NULL,
                           goal_amount DECIMAL(10, 2) NOT NULL,
                           current_amount DECIMAL(10, 2) DEFAULT 0,
                           end_date TIMESTAMPTZ
);

CREATE TABLE donations (
                           donation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                           campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
                           user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
                           amount DECIMAL(10, 2) NOT NULL,
                           donation_date TIMESTAMPTZ DEFAULT now()
);