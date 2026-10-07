-- Un contacto necesita al menos un teléfono o un correo (2026-10-07). El API guarda null cuando un campo
-- llega vacío; el btrim cubre además cadenas en blanco escritas a mano en la base.
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_phone_or_email"
  CHECK (btrim(coalesce("phone", '')) <> '' OR btrim(coalesce("email", '')) <> '');
