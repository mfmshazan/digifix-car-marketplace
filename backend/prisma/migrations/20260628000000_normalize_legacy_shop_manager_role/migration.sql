-- SHOP_MANAGER was the legacy name for marketplace sellers. The application
-- now consistently authorizes that role as SALESMAN. Prisma cannot deserialize
-- User rows containing enum values that are absent from schema.prisma, so
-- normalize the stored data before it reaches the client.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'UserRole'
      AND pg_enum.enumlabel = 'SHOP_MANAGER'
  ) THEN
    EXECUTE 'UPDATE "User"
             SET role = ''SALESMAN''::"UserRole"
             WHERE role = ''SHOP_MANAGER''::"UserRole"';
  END IF;
END
$$;
