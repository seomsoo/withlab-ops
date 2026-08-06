-- ==========================================================================
-- 운영 DB 스키마 스냅샷 — 2026-08-06
-- ==========================================================================
--
-- 출처: 운영 Supabase 프로젝트에서 `supabase db dump --schema-only` 로 추출.
--       (인수자 조직으로 프로젝트 이관하기 직전 시점)
--
-- [이 파일의 위상]
-- 현재 운영 DB 상태의 **단일 진실 공급원**이다. 아래 두 자료보다 우선한다.
--   - docs/REF_DB_스키마.md : 초기 설계 문서. 실제 DB보다 뒤처져 있다
--     (문서 15개 테이블 vs 실제 16개 — supplier_tracking_templates 누락)
--   - supabase/migrations/*.sql : 전부 증분 마이그레이션이라, 최초 테이블 생성
--     SQL이 저장소에 없다. 이 18개만으로는 DB를 처음부터 만들 수 없다
--
-- [왜 migrations/ 에 두지 않는가]
-- 이 스냅샷은 증분 마이그레이션이 **이미 전부 적용된 결과물**이다.
-- migrations/ 에 넣으면 뒤따르는 마이그레이션들과 중복 실행되어 충돌한다.
-- DB를 처음부터 재구축할 때는 migrations/ 를 순서대로 돌리는 대신
-- **이 파일 하나만 실행**하면 된다.
--
-- [주의] 이 스냅샷은 아래 시점의 상태다.
--   - 20260806_fix_dashboard_view_security.sql : 적용 **전** (anon GRANT가 남아 있음)
--   - 20260806_rewrite_dashboard_view.sql      : 적용 **전** (교차곱 뷰 그대로)
-- 재구축 시에는 이 파일을 실행한 뒤 위 두 마이그레이션을 이어서 적용할 것.
--
-- [갱신 방법] 스키마가 크게 바뀌면 다시 뜬다.
--   npx supabase db dump --db-url "<연결문자열>" -f supabase/schema_snapshot_<날짜>.sql
--
-- [데이터는 포함되지 않음] 데이터 덤프는 수령인 이름·전화번호 등 개인정보를
-- 포함하므로 저장소에 커밋하지 않는다 (.gitignore 의 data_*.sql 패턴 참조).
-- ==========================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."complete_order_session"("p_work_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- 1. work_session.status가 active인지 확인
  if not exists (
    select 1 from work_sessions
    where id = p_work_session_id and status = 'active'
  ) then
    raise exception 'work_session is not active';
  end if;

  -- 2. 미배정 주문이 없는지 확인
  if exists (
    select 1 from orders o
    where o.work_session_id = p_work_session_id
      and not exists (
        select 1 from allocations a where a.order_id = o.id
      )
  ) then
    raise exception 'unallocated orders exist';
  end if;

  -- 3. allocations 상태 변경
  update allocations
  set status = 'ordered', ordered_at = now()
  where order_id in (
    select id from orders where work_session_id = p_work_session_id
  ) and status = 'pending';

  -- 4. work_session 상태 변경
  update work_sessions
  set status = 'ordered', completed_at = now()
  where id = p_work_session_id;
end;
$$;


ALTER FUNCTION "public"."complete_order_session"("p_work_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_work_session"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_status text;
  v_matched_count int;
begin
  select status into v_status
  from work_sessions
  where id = p_session_id;

  if v_status is null then
    raise exception 'work_session not found';
  end if;

  if v_status = 'completed' then
    return;
  end if;

  if v_status not in ('active', 'ordered') then
    raise exception '진행중 또는 발주완료 상태의 작업건만 완료할 수 있습니다';
  end if;

  select count(*) into v_matched_count
  from trackings
  where work_session_id = p_session_id
    and status = 'matched';

  if v_matched_count = 0 then
    raise exception '매칭된 운송장이 없습니다. 운송장을 먼저 업로드해 주세요.';
  end if;

  if v_status = 'active' then
    update allocations
    set status = 'ordered'
    where order_id in (
      select id from orders where work_session_id = p_session_id
    ) and status = 'pending';

    update work_sessions
    set ordered_at = now()
    where id = p_session_id;
  end if;

  update work_sessions
  set status = 'completed', completed_at = now()
  where id = p_session_id;
end;
$$;


ALTER FUNCTION "public"."complete_work_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_product_counts"() RETURNS TABLE("supplier_id" "uuid", "count" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  select supplier_id, count(*) as count
  from supplier_products
  group by supplier_id;
$$;


ALTER FUNCTION "public"."get_supplier_product_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."overwrite_tracking_match"("p_tracking_id" "uuid", "p_allocation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update trackings
  set status = 'duplicated',
      invalid_reason = '수동 매칭으로 대체됨'
  where allocation_id = p_allocation_id
    and status = 'matched';

  update trackings
  set status = 'matched',
      allocation_id = p_allocation_id,
      matched_at = now(),
      invalid_reason = null
  where id = p_tracking_id;
end;
$$;


ALTER FUNCTION "public"."overwrite_tracking_match"("p_tracking_id" "uuid", "p_allocation_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


ALTER TABLE "public"."allocations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_allocations_for_group"("p_work_session_id" "uuid", "p_order_ids" "uuid"[], "p_new_allocations" "jsonb") RETURNS SETOF "public"."allocations"
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from allocations
  where work_session_id = p_work_session_id
    and order_id = any(p_order_ids);

  return query
    insert into allocations (
      work_session_id, order_id, supplier_id,
      supplier_product_name, supplier_product_code,
      allocated_quantity, status, is_temporary_override,
      name_mapping_applied, smart_allocation_applied,
      supplier_price, allocation_reason
    )
    select
      p_work_session_id,
      (item->>'order_id')::uuid,
      (item->>'supplier_id')::uuid,
      item->>'supplier_product_name',
      item->>'supplier_product_code',
      (item->>'allocated_quantity')::int,
      'pending',
      coalesce((item->>'is_temporary_override')::bool, false),
      item->>'name_mapping_applied',
      coalesce((item->>'smart_allocation_applied')::bool, false),
      (item->>'supplier_price')::numeric,
      item->>'allocation_reason'
    from jsonb_array_elements(p_new_allocations) as item
    returning *;
end;
$$;


ALTER FUNCTION "public"."replace_allocations_for_group"("p_work_session_id" "uuid", "p_order_ids" "uuid"[], "p_new_allocations" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_supplier_products"("p_supplier_id" "uuid", "p_products" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count integer;
begin
  delete from supplier_products where supplier_id = p_supplier_id;

  insert into supplier_products (
    supplier_id, product_code, product_name, option_name, category,
    price, stock_status, stock_raw, courier, extra
  )
  select
    p_supplier_id,
    coalesce(elem->>'productCode', ''),
    elem->>'productName',
    coalesce(elem->>'optionName', ''),
    coalesce(elem->>'category', ''),
    (elem->>'price')::integer,
    coalesce(elem->>'stockStatus', 'unknown'),
    coalesce(elem->>'stockRaw', ''),
    coalesce(elem->>'courier', ''),
    coalesce((elem->'extra')::jsonb, '{}'::jsonb)
  from jsonb_array_elements(p_products) as elem;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."replace_supplier_products"("p_supplier_id" "uuid", "p_products" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_order_session"("p_work_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if not exists (
    select 1 from work_sessions
    where id = p_work_session_id and status = 'ordered'
  ) then
    raise exception 'work_session is not in ordered status';
  end if;

  update allocations
  set status = 'pending', ordered_at = null
  where order_id in (
    select id from orders where work_session_id = p_work_session_id
  ) and status = 'ordered';

  update work_sessions
  set status = 'active', completed_at = null
  where id = p_work_session_id;
end;
$$;


ALTER FUNCTION "public"."revert_order_session"("p_work_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."switch_default_supplier"("p_platform" "text", "p_product_name" "text", "p_option_name" "text", "p_new_supplier_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update product_mappings
  set is_default = false
  where platform = p_platform
    and product_name = p_product_name
    and option_name = p_option_name
    and is_default = true
    and supplier_id != p_new_supplier_id;

  if exists (
    select 1 from product_mappings
    where platform = p_platform
      and product_name = p_product_name
      and option_name = p_option_name
      and supplier_id = p_new_supplier_id
  ) then
    update product_mappings
    set is_default = true, priority = 0
    where platform = p_platform
      and product_name = p_product_name
      and option_name = p_option_name
      and supplier_id = p_new_supplier_id;
  else
    insert into product_mappings (
      platform, product_name, option_name,
      supplier_id, is_default, priority
    ) values (
      p_platform, p_product_name, p_option_name,
      p_new_supplier_id, true, 0
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."switch_default_supplier"("p_platform" "text", "p_product_name" "text", "p_option_name" "text", "p_new_supplier_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_name" "text" NOT NULL,
    "coupang_name" "text" NOT NULL,
    "toss_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courier_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fruit_dictionary" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "keywords" "text"[] NOT NULL,
    "grade_synonyms" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "size_synonyms" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "weight_aliases" "jsonb" DEFAULT '{"kg": ["키로", "KG", "킬로"]}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weight_mapping" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."fruit_dictionary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."name_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" DEFAULT 'common'::"text" NOT NULL,
    "platform_product_name" "text" NOT NULL,
    "platform_option_name" "text" DEFAULT ''::"text" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "supplier_product_name" "text" NOT NULL,
    "supplier_product_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "name_mappings_platform_check" CHECK (("platform" = ANY (ARRAY['coupang'::"text", 'toss'::"text", 'common'::"text"])))
);


ALTER TABLE "public"."name_mappings" OWNER TO "postgres";


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


ALTER TABLE "public"."order_imports" OWNER TO "postgres";


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


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "template_path" "text" NOT NULL,
    "template_file_name" "text" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "header_row" integer NOT NULL,
    "data_start_row" integer NOT NULL,
    "match_key_column_index" integer NOT NULL,
    "match_key_column_name" "text" NOT NULL,
    "tracking_company_column_index" integer NOT NULL,
    "tracking_company_column_name" "text" NOT NULL,
    "tracking_number_column_index" integer NOT NULL,
    "tracking_number_column_name" "text" NOT NULL,
    "status_column_index" integer,
    "status_column_name" "text",
    "status_value" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "platform_templates_platform_check" CHECK (("platform" = ANY (ARRAY['coupang'::"text", 'toss'::"text"])))
);


ALTER TABLE "public"."platform_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" DEFAULT 'common'::"text" NOT NULL,
    "product_name" "text" NOT NULL,
    "option_name" "text" DEFAULT ''::"text" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "is_default" boolean DEFAULT true,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "product_mappings_platform_check" CHECK (("platform" = ANY (ARRAY['coupang'::"text", 'toss'::"text", 'common'::"text"])))
);


ALTER TABLE "public"."product_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_product_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "template_path" "text" NOT NULL,
    "template_file_name" "text" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "header_row" integer DEFAULT 1 NOT NULL,
    "data_start_row" integer DEFAULT 2 NOT NULL,
    "column_mappings" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "last_uploaded_file_name" "text",
    "last_uploaded_at" timestamp with time zone,
    "last_uploaded_count" integer DEFAULT 0 NOT NULL,
    "last_invalid_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_product_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "product_code" "text" DEFAULT ''::"text" NOT NULL,
    "product_name" "text" NOT NULL,
    "option_name" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" DEFAULT ''::"text" NOT NULL,
    "price" integer,
    "stock_status" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "stock_raw" "text" DEFAULT ''::"text" NOT NULL,
    "courier" "text" DEFAULT ''::"text" NOT NULL,
    "extra" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "supplier_products_stock_status_check" CHECK (("stock_status" = ANY (ARRAY['available'::"text", 'soldout'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."supplier_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "template_path" "text" NOT NULL,
    "template_file_name" "text" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "header_row" integer DEFAULT 1 NOT NULL,
    "data_start_row" integer DEFAULT 2 NOT NULL,
    "column_mappings" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_tracking_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "sheet_name" "text" DEFAULT ''::"text" NOT NULL,
    "header_row" integer DEFAULT 1 NOT NULL,
    "data_start_row" integer DEFAULT 2 NOT NULL,
    "order_key_column" integer NOT NULL,
    "order_key_header" "text" NOT NULL,
    "tracking_number_column" integer NOT NULL,
    "tracking_number_header" "text" NOT NULL,
    "courier_column" integer,
    "courier_header" "text",
    "default_courier" "text",
    "product_name_column" integer,
    "product_name_header" "text",
    "recipient_column" integer,
    "recipient_header" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_tracking_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact" "text",
    "memo" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracking_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_session_id" "uuid" NOT NULL,
    "source_supplier_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "total_rows" integer DEFAULT 0 NOT NULL,
    "valid_count" integer DEFAULT 0 NOT NULL,
    "invalid_count" integer DEFAULT 0 NOT NULL,
    "skipped_rows" integer DEFAULT 0 NOT NULL,
    "detected_courier" "text",
    "invalid_rows" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."tracking_imports" OWNER TO "postgres";


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


ALTER TABLE "public"."trackings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."work_session_dashboard_view" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "name",
    NULL::"text" AS "status",
    NULL::timestamp with time zone AS "created_at",
    NULL::"uuid" AS "created_by",
    NULL::timestamp with time zone AS "completed_at",
    NULL::bigint AS "order_count",
    NULL::bigint AS "allocation_count",
    NULL::bigint AS "supplier_count",
    NULL::bigint AS "tracking_count",
    NULL::bigint AS "matched_tracking_count",
    NULL::bigint AS "unmatched_tracking_count";


ALTER VIEW "public"."work_session_dashboard_view" OWNER TO "postgres";


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


ALTER TABLE "public"."work_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_mappings"
    ADD CONSTRAINT "courier_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_mappings"
    ADD CONSTRAINT "courier_mappings_source_name_key" UNIQUE ("source_name");



ALTER TABLE ONLY "public"."fruit_dictionary"
    ADD CONSTRAINT "fruit_dictionary_category_key" UNIQUE ("category");



ALTER TABLE ONLY "public"."fruit_dictionary"
    ADD CONSTRAINT "fruit_dictionary_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."name_mappings"
    ADD CONSTRAINT "name_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."name_mappings"
    ADD CONSTRAINT "name_mappings_platform_platform_product_name_platform_optio_key" UNIQUE ("platform", "platform_product_name", "platform_option_name", "supplier_id");



ALTER TABLE ONLY "public"."order_imports"
    ADD CONSTRAINT "order_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_work_session_id_platform_matching_key_key" UNIQUE ("work_session_id", "platform", "matching_key");



ALTER TABLE ONLY "public"."platform_templates"
    ADD CONSTRAINT "platform_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_templates"
    ADD CONSTRAINT "platform_templates_platform_key" UNIQUE ("platform");



ALTER TABLE ONLY "public"."product_mappings"
    ADD CONSTRAINT "product_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_mappings"
    ADD CONSTRAINT "product_mappings_platform_product_name_option_name_supplier_key" UNIQUE ("platform", "product_name", "option_name", "supplier_id");



ALTER TABLE ONLY "public"."supplier_product_templates"
    ADD CONSTRAINT "supplier_product_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_product_templates"
    ADD CONSTRAINT "supplier_product_templates_supplier_id_key" UNIQUE ("supplier_id");



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_templates"
    ADD CONSTRAINT "supplier_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_templates"
    ADD CONSTRAINT "supplier_templates_supplier_id_key" UNIQUE ("supplier_id");



ALTER TABLE ONLY "public"."supplier_tracking_templates"
    ADD CONSTRAINT "supplier_tracking_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_tracking_templates"
    ADD CONSTRAINT "supplier_tracking_templates_supplier_id_key" UNIQUE ("supplier_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_imports"
    ADD CONSTRAINT "tracking_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trackings"
    ADD CONSTRAINT "trackings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracking_imports"
    ADD CONSTRAINT "uniq_ti_session_supplier" UNIQUE ("work_session_id", "source_supplier_id");



ALTER TABLE ONLY "public"."order_imports"
    ADD CONSTRAINT "uq_order_import_ws_platform_label" UNIQUE ("work_session_id", "platform", "label");



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_alloc_status" ON "public"."allocations" USING "btree" ("work_session_id", "status");



CREATE INDEX "idx_alloc_supplier" ON "public"."allocations" USING "btree" ("work_session_id", "supplier_id");



CREATE INDEX "idx_alloc_ws" ON "public"."allocations" USING "btree" ("work_session_id");



CREATE INDEX "idx_nm_lookup" ON "public"."name_mappings" USING "btree" ("supplier_id", "platform", "platform_product_name");



CREATE INDEX "idx_orders_match" ON "public"."orders" USING "btree" ("work_session_id", "matching_key");



CREATE INDEX "idx_orders_order_import_id" ON "public"."orders" USING "btree" ("order_import_id");



CREATE INDEX "idx_orders_product" ON "public"."orders" USING "btree" ("work_session_id", "product_name", "option_name");



CREATE INDEX "idx_orders_ws" ON "public"."orders" USING "btree" ("work_session_id");



CREATE INDEX "idx_pm_lookup" ON "public"."product_mappings" USING "btree" ("platform", "product_name", "option_name");



CREATE INDEX "idx_sp_name" ON "public"."supplier_products" USING "btree" ("supplier_id", "product_name");



CREATE INDEX "idx_sp_supplier" ON "public"."supplier_products" USING "btree" ("supplier_id");



CREATE INDEX "idx_sp_supplier_name_option" ON "public"."supplier_products" USING "btree" ("supplier_id", "product_name", "option_name");



CREATE INDEX "idx_ti_ws" ON "public"."tracking_imports" USING "btree" ("work_session_id");



CREATE INDEX "idx_track_alloc" ON "public"."trackings" USING "btree" ("allocation_id");



CREATE INDEX "idx_track_status" ON "public"."trackings" USING "btree" ("work_session_id", "status");



CREATE INDEX "idx_track_ws" ON "public"."trackings" USING "btree" ("work_session_id");



CREATE INDEX "idx_ws_created" ON "public"."work_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ws_status" ON "public"."work_sessions" USING "btree" ("status");



CREATE UNIQUE INDEX "uniq_active_supplier_name" ON "public"."suppliers" USING "btree" ("name") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "uniq_matched_tracking_per_allocation" ON "public"."trackings" USING "btree" ("allocation_id") WHERE (("status" = 'matched'::"text") AND ("allocation_id" IS NOT NULL));



CREATE UNIQUE INDEX "uniq_ti_ws_supplier" ON "public"."tracking_imports" USING "btree" ("work_session_id", "source_supplier_id");



CREATE UNIQUE INDEX "uniq_tracking_matched_alloc" ON "public"."trackings" USING "btree" ("allocation_id") WHERE ("status" = 'matched'::"text");



CREATE OR REPLACE VIEW "public"."work_session_dashboard_view" AS
 SELECT "ws"."id",
    "ws"."name",
    "ws"."status",
    "ws"."created_at",
    "ws"."created_by",
    "ws"."completed_at",
    "count"(DISTINCT "o"."id") AS "order_count",
    "count"(DISTINCT "a"."id") AS "allocation_count",
    "count"(DISTINCT "a"."supplier_id") AS "supplier_count",
    "count"(DISTINCT "t"."id") AS "tracking_count",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."status" = 'matched'::"text")) AS "matched_tracking_count",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."status" = ANY (ARRAY['unmatched'::"text", 'duplicated'::"text", 'invalid'::"text"]))) AS "unmatched_tracking_count"
   FROM ((("public"."work_sessions" "ws"
     LEFT JOIN "public"."orders" "o" ON (("o"."work_session_id" = "ws"."id")))
     LEFT JOIN "public"."allocations" "a" ON (("a"."order_id" = "o"."id")))
     LEFT JOIN "public"."trackings" "t" ON (("t"."work_session_id" = "ws"."id")))
  GROUP BY "ws"."id";



CREATE OR REPLACE TRIGGER "trg_fd_updated" BEFORE UPDATE ON "public"."fruit_dictionary" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_nm_updated" BEFORE UPDATE ON "public"."name_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pm_updated" BEFORE UPDATE ON "public"."product_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pt_updated" BEFORE UPDATE ON "public"."platform_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_st_updated" BEFORE UPDATE ON "public"."supplier_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_suppliers_updated" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."allocations"
    ADD CONSTRAINT "allocations_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "public"."work_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."name_mappings"
    ADD CONSTRAINT "name_mappings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_imports"
    ADD CONSTRAINT "order_imports_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_imports"
    ADD CONSTRAINT "order_imports_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "public"."work_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_import_id_fkey" FOREIGN KEY ("order_import_id") REFERENCES "public"."order_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "public"."work_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_mappings"
    ADD CONSTRAINT "product_mappings_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_product_templates"
    ADD CONSTRAINT "supplier_product_templates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_products"
    ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_templates"
    ADD CONSTRAINT "supplier_templates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_tracking_templates"
    ADD CONSTRAINT "supplier_tracking_templates_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tracking_imports"
    ADD CONSTRAINT "tracking_imports_source_supplier_id_fkey" FOREIGN KEY ("source_supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."tracking_imports"
    ADD CONSTRAINT "tracking_imports_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tracking_imports"
    ADD CONSTRAINT "tracking_imports_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "public"."work_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trackings"
    ADD CONSTRAINT "trackings_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "public"."allocations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trackings"
    ADD CONSTRAINT "trackings_source_supplier_id_fkey" FOREIGN KEY ("source_supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."trackings"
    ADD CONSTRAINT "trackings_tracking_import_id_fkey" FOREIGN KEY ("tracking_import_id") REFERENCES "public"."tracking_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trackings"
    ADD CONSTRAINT "trackings_work_session_id_fkey" FOREIGN KEY ("work_session_id") REFERENCES "public"."work_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_sessions"
    ADD CONSTRAINT "work_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow all for authenticated" ON "public"."supplier_tracking_templates" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auth_all" ON "public"."allocations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."courier_mappings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."fruit_dictionary" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."name_mappings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."order_imports" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."orders" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."platform_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."product_mappings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."supplier_product_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."supplier_products" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."supplier_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."suppliers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."tracking_imports" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."trackings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth_all" ON "public"."work_sessions" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."courier_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fruit_dictionary" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."name_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_product_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_tracking_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracking_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trackings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."allocations" TO "anon";
GRANT ALL ON TABLE "public"."allocations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."allocations" TO "service_role";


















GRANT ALL ON TABLE "public"."courier_mappings" TO "anon";
GRANT ALL ON TABLE "public"."courier_mappings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."fruit_dictionary" TO "anon";
GRANT ALL ON TABLE "public"."fruit_dictionary" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."fruit_dictionary" TO "service_role";



GRANT ALL ON TABLE "public"."name_mappings" TO "anon";
GRANT ALL ON TABLE "public"."name_mappings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."name_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."order_imports" TO "anon";
GRANT ALL ON TABLE "public"."order_imports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_imports" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."platform_templates" TO "anon";
GRANT ALL ON TABLE "public"."platform_templates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."platform_templates" TO "service_role";



GRANT ALL ON TABLE "public"."product_mappings" TO "anon";
GRANT ALL ON TABLE "public"."product_mappings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_product_templates" TO "anon";
GRANT ALL ON TABLE "public"."supplier_product_templates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."supplier_product_templates" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_products" TO "anon";
GRANT ALL ON TABLE "public"."supplier_products" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."supplier_products" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_templates" TO "anon";
GRANT ALL ON TABLE "public"."supplier_templates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."supplier_templates" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_tracking_templates" TO "anon";
GRANT ALL ON TABLE "public"."supplier_tracking_templates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."supplier_tracking_templates" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tracking_imports" TO "anon";
GRANT ALL ON TABLE "public"."tracking_imports" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."tracking_imports" TO "service_role";



GRANT ALL ON TABLE "public"."trackings" TO "anon";
GRANT ALL ON TABLE "public"."trackings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trackings" TO "service_role";



GRANT ALL ON TABLE "public"."work_session_dashboard_view" TO "anon";
GRANT ALL ON TABLE "public"."work_session_dashboard_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."work_session_dashboard_view" TO "service_role";



GRANT ALL ON TABLE "public"."work_sessions" TO "anon";
GRANT ALL ON TABLE "public"."work_sessions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."work_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































