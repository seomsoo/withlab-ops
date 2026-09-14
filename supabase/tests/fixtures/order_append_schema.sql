-- 테스트 전용: 빈 임시 DB에만 적용. 운영 DB에서는 실행하지 않는다.


CREATE TABLE IF NOT EXISTS "public"."work_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "completed_at" timestamp with time zone,
    "ordered_at" timestamp with time zone,
    CONSTRAINT "work_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'ordered'::"text", 'completed'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."order_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_session_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "total_rows" integer DEFAULT 0 NOT NULL,
    "valid_count" integer DEFAULT 0 NOT NULL,
    "invalid_count" integer DEFAULT 0 NOT NULL,
    "duplicate_count" integer DEFAULT 0 NOT NULL,
    "invalid_rows" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "duplicate_rows" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "label" "text" NOT NULL,
    CONSTRAINT "order_imports_platform_check" CHECK (("platform" = ANY (ARRAY['coupang'::"text", 'toss'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_session_id" "uuid" NOT NULL,
    "order_import_id" "uuid" NOT NULL,
    "platform" "text" NOT NULL,
    "order_no" "text" NOT NULL,
    "order_item_no" "text" NOT NULL,
    "matching_key" "text" NOT NULL,
    "order_date" timestamp with time zone,
    "product_name" "text" NOT NULL,
    "option_name" "text" DEFAULT ''::"text" NOT NULL,
    "quantity" integer NOT NULL,
    "buyer_name" "text",
    "buyer_phone" "text",
    "buyer_phone_digits" "text",
    "recipient_name" "text" NOT NULL,
    "recipient_phone" "text",
    "recipient_phone_digits" "text",
    "zip_code" "text",
    "address" "text" NOT NULL,
    "delivery_message" "text",
    "raw" "jsonb" NOT NULL,
    "raw_values" "jsonb" NOT NULL,
    "raw_row_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "display_product_name" "text",
    CONSTRAINT "orders_platform_check" CHECK (("platform" = ANY (ARRAY['coupang'::"text", 'toss'::"text"]))),
    CONSTRAINT "orders_quantity_check" CHECK (("quantity" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_session_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "supplier_product_name" "text" NOT NULL,
    "supplier_product_code" "text",
    "allocated_quantity" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "is_temporary_override" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ordered_at" timestamp with time zone,
    "name_mapping_applied" boolean DEFAULT false NOT NULL,
    "smart_allocation_applied" boolean DEFAULT false NOT NULL,
    "supplier_price" integer,
    "allocation_reason" "text",
    CONSTRAINT "allocations_allocated_quantity_check" CHECK (("allocated_quantity" > 0)),
    CONSTRAINT "allocations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ordered'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."trackings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_session_id" "uuid" NOT NULL,
    "tracking_import_id" "uuid" NOT NULL,
    "allocation_id" "uuid",
    "status" "text" NOT NULL,
    "invalid_reason" "text",
    "tracking_company" "text",
    "tracking_number" "text",
    "source_supplier_id" "uuid" NOT NULL,
    "raw_order_key" "text",
    "raw" "jsonb" NOT NULL,
    "raw_row_number" integer NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "matched_at" timestamp with time zone,
    "ignored" boolean DEFAULT false,
    "ignored_reason" "text",
    CONSTRAINT "trackings_status_check" CHECK (("status" = ANY (ARRAY['matched'::"text", 'unmatched'::"text", 'duplicated'::"text", 'invalid'::"text"])))
);

ALTER TABLE work_sessions ADD PRIMARY KEY (id);
ALTER TABLE order_imports ADD PRIMARY KEY (id);
ALTER TABLE orders ADD PRIMARY KEY (id);
ALTER TABLE allocations ADD PRIMARY KEY (id);
ALTER TABLE trackings ADD PRIMARY KEY (id);
ALTER TABLE order_imports ADD UNIQUE (work_session_id, platform, label);
ALTER TABLE orders ADD UNIQUE (work_session_id, platform, matching_key);
ALTER TABLE allocations ADD UNIQUE (order_id);
ALTER TABLE order_imports ADD FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE;
ALTER TABLE orders ADD FOREIGN KEY (order_import_id) REFERENCES order_imports(id) ON DELETE CASCADE;
ALTER TABLE orders ADD FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE;
ALTER TABLE allocations ADD FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE trackings ADD FOREIGN KEY (allocation_id) REFERENCES allocations(id) ON DELETE SET NULL;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;


ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON work_sessions TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE order_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON order_imports TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON orders TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON allocations TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE trackings ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON trackings TO authenticated USING (true) WITH CHECK (true);
