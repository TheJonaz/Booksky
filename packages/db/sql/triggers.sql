-- Oföränderlighet för bokförda verifikationer (BFL 5 kap 6 §).
-- Applicerades efter drizzle-kit push.

-- Verifikation: får inte UPDATE/DELETE om redan postad.
-- Undantag: posting (NULL → timestamp) samt hash-uppdatering i samma transaktion
--           där postedAt sätts. För enkelhet: tillåt UPDATE endast när OLD.posted_at IS NULL.
CREATE OR REPLACE FUNCTION voucher_immutable_trg()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.posted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Bokförd verifikation % får inte raderas (BFL 5:6). Skapa rättelseverifikation.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.posted_at IS NOT NULL THEN
      -- Bara tillåt om ingen affärsdata ändras (alla kolumner utom hash-fält är samma).
      -- I praktiken: bokförda verifikationer är låsta.
      IF NEW.voucher_date IS DISTINCT FROM OLD.voucher_date
         OR NEW.description IS DISTINCT FROM OLD.description
         OR NEW.series IS DISTINCT FROM OLD.series
         OR NEW.number IS DISTINCT FROM OLD.number
         OR NEW.fiscal_year_id IS DISTINCT FROM OLD.fiscal_year_id
         OR NEW.company_id IS DISTINCT FROM OLD.company_id
         OR NEW.posted_at IS DISTINCT FROM OLD.posted_at
         OR NEW.corrects_voucher_id IS DISTINCT FROM OLD.corrects_voucher_id THEN
        RAISE EXCEPTION 'Bokförd verifikation % får inte ändras (BFL 5:6). Skapa rättelseverifikation.', OLD.id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voucher_immutable ON vouchers;
CREATE TRIGGER voucher_immutable
BEFORE UPDATE OR DELETE ON vouchers
FOR EACH ROW EXECUTE FUNCTION voucher_immutable_trg();

-- Voucher_lines: får inte ändras om voucher är postad.
CREATE OR REPLACE FUNCTION voucher_lines_immutable_trg()
RETURNS trigger AS $$
DECLARE
  posted timestamptz;
  v_id int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.voucher_id;
  ELSE
    v_id := NEW.voucher_id;
  END IF;

  SELECT posted_at INTO posted FROM vouchers WHERE id = v_id;
  IF posted IS NOT NULL THEN
    RAISE EXCEPTION 'Rader på bokförd verifikation % får inte ändras (BFL 5:6).', v_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voucher_lines_immutable ON voucher_lines;
CREATE TRIGGER voucher_lines_immutable
BEFORE INSERT OR UPDATE OR DELETE ON voucher_lines
FOR EACH ROW EXECUTE FUNCTION voucher_lines_immutable_trg();

-- Audit-logg får aldrig uppdateras eller raderas (append-only).
CREATE OR REPLACE FUNCTION audit_log_append_only_trg()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log är append-only (% ej tillåtet)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
CREATE TRIGGER audit_log_append_only
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_append_only_trg();
