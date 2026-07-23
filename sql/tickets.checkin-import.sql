/* Ejecutar en la base PACO_ADMIN_S4HANA.
   Agrega solamente la lectura de formularios CheckIn al modulo global. */
CREATE OR ALTER PROCEDURE dbo.PACO_GET_TICKET_CHECKIN
    @Formulario INT = 14
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        RD.respuesta,
        RD.pregunta,
        P.descripcion AS pregunta_descripcion,
        RD.valor,
        RD.formulario,
        F.descripcion AS formulario_descripcion,
        RD.tipo_pregunta
    FROM [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Respuesta_Detalle] AS RD
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Preguntas] AS P
        ON P.pregunta = RD.pregunta
    LEFT JOIN [10.10.10.10].[CHECKIN_APP_S4HANA].[dbo].[tbl_Check_Formulario] AS F
        ON F.formulario = RD.formulario
    WHERE RD.formulario = @Formulario;
END
GO
