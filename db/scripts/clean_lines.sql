DELETE FROM piping.lineas WHERE codigo NOT LIKE '03351-%';
SELECT count(*) AS total_lineas_reales FROM piping.lineas;
