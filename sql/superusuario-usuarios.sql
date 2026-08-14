/*
  Rol administrativo para la gestion de usuarios.
  La asignacion es idempotente y se puede ejecutar en SQL Server las veces necesarias.
*/
SET NOCOUNT ON;

DECLARE @RoleId NVARCHAR(450) = 'PACO-ROL-SUPERUSUARIO';
DECLARE @UserId NVARCHAR(450);

IF NOT EXISTS (
  SELECT 1
  FROM dbo.AspNetRoles
  WHERE NormalizedName = 'SUPERUSUARIO'
)
BEGIN
  INSERT INTO dbo.AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
  VALUES (@RoleId, 'SUPERUSUARIO', 'SUPERUSUARIO', CONVERT(NVARCHAR(36), NEWID()));
END
ELSE
BEGIN
  SELECT @RoleId = Id
  FROM dbo.AspNetRoles
  WHERE NormalizedName = 'SUPERUSUARIO';
END;

SELECT TOP (1) @UserId = Id
FROM dbo.AspNetUsers
WHERE NormalizedUserName = 'YOVANNI.AMADOR@ISTMANIA.HN'
   OR NormalizedEmail = 'YOVANNI.AMADOR@ISTMANIA.HN';

IF @UserId IS NULL
  THROW 50001, 'No se encontro el usuario yovanni.amador@istmania.hn para asignar SUPERUSUARIO.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.AspNetUserRoles
  WHERE UserId = @UserId AND RoleId = @RoleId
)
BEGIN
  INSERT INTO dbo.AspNetUserRoles (UserId, RoleId)
  VALUES (@UserId, @RoleId);
END;
