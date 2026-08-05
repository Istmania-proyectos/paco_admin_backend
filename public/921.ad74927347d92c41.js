'use strict';
(self.webpackChunkpaco_admin = self.webpackChunkpaco_admin || []).push([
  [921],
  {
    5921(it, C, s) {
      s.d(C, { TicketApprovalModule: () => et });
      var g = s(9266),
        m = s(3049),
        u = s(980),
        t = s(5547),
        c = s(5802),
        f = s(631),
        F = s(5130),
        p = s(6091),
        k = s(3746),
        h = s(8834),
        d = s(9417),
        R = s(9183),
        M = s(1518),
        E = s(2798),
        j = s(5868),
        _ = s(5084),
        P = s(9769);
      const A = () => ['CAMBIO', 'DEVOLUCION', 'NOTA_CREDITO'],
        x = (n, r) => r.IdTicketProducto;
      function v(n, r) {
        1 & n &&
          (t.j41(0, 'div', 4),
          t.nrm(1, 'mat-spinner', 8),
          t.j41(2, 'h1'),
          t.EFF(3, 'Consultando ticket'),
          t.k0s()());
      }
      function T(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'div', 5)(1, 'mat-icon'),
            t.EFF(2, 'link_off'),
            t.k0s(),
            t.j41(3, 'h1'),
            t.EFF(4, 'Enlace no disponible'),
            t.k0s(),
            t.j41(5, 'p'),
            t.EFF(6),
            t.k0s()()),
          2 & n)
        ) {
          const o = t.XpG();
          t.R7$(6), t.JRh(o.error);
        }
      }
      function O(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'div', 6)(1, 'mat-icon'),
            t.EFF(2, 'task_alt'),
            t.k0s(),
            t.j41(3, 'h1'),
            t.EFF(4, 'Respuesta registrada'),
            t.k0s(),
            t.j41(5, 'p'),
            t.EFF(6, 'El ticket '),
            t.j41(7, 'strong'),
            t.EFF(8),
            t.k0s(),
            t.EFF(9),
            t.k0s(),
            t.j41(10, 'small'),
            t.EFF(11, 'Ya puede cerrar esta ventana.'),
            t.k0s()()),
          2 & n)
        ) {
          const o = t.XpG();
          t.R7$(8),
            t.JRh(o.ticket.NumeroTicket),
            t.R7$(),
            t.SpI(
              ' qued\xf3 en estado ',
              o.ticket.Estado.replaceAll('_', ' '),
              '.',
            );
        }
      }
      function b(n, r) {
        1 & n &&
          t.EFF(
            0,
            ' Defina un plan para cada producto. Puede copiar el primero a todos y despu\xe9s ajustar las excepciones. ',
          );
      }
      function y(n, r) {
        1 & n &&
          t.EFF(
            0,
            ' Confirme el inicio de ejecuci\xf3n de cada plan aprobado. ',
          );
      }
      function I(n, r) {
        1 & n &&
          t.EFF(0, ' Apruebe o rechace cada plan de forma independiente. ');
      }
      function V(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'button', 15),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.XpG(3);
              return c.Njj(e.aplicarPrimerPlanATodos());
            }),
            t.j41(1, 'mat-icon'),
            t.EFF(2, 'content_copy'),
            t.k0s(),
            t.EFF(3, 'Copiar el primer plan a todos '),
            t.k0s();
        }
      }
      function G(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'section', 16)(1, 'mat-icon'),
            t.EFF(2, 'policy'),
            t.k0s(),
            t.j41(3, 'div')(4, 'strong'),
            t.EFF(5, 'Reporte fuera de la pol\xedtica de tres meses'),
            t.k0s(),
            t.j41(6, 'p'),
            t.EFF(7),
            t.nI1(8, 'date'),
            t.k0s()()()),
          2 & n)
        ) {
          const o = t.XpG().$implicit;
          t.R7$(7),
            t.SpI(
              'Para cumplir la pol\xedtica, el vencimiento deb\xeda ser igual o posterior al ',
              t.i5U(8, 1, o.FechaMinimaPolitica, 'dd/MM/yyyy'),
              '. Puede rechazarse y cerrarse definitivamente.',
            );
        }
      }
      function N(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'section', 17)(1, 'mat-icon'),
            t.EFF(2, 'verified_user'),
            t.k0s(),
            t.j41(3, 'div')(4, 'strong'),
            t.EFF(5, 'Autorizaci\xf3n especial del Jefe de Marca'),
            t.k0s(),
            t.j41(6, 'p'),
            t.EFF(7),
            t.k0s()()()),
          2 & n)
        ) {
          const o = t.XpG().$implicit;
          t.R7$(7),
            t.SpI(
              'Este producto omitir\xe1 la aprobaci\xf3n de Mercadeo. ',
              t.lJ4(1, A).includes(o.tipoAccionRespuesta || '')
                ? 'Pasar\xe1 directamente a Gerencia General.'
                : 'Quedar\xe1 aprobado para iniciar su ejecuci\xf3n.',
            );
        }
      }
      function D(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Decisi\xf3n para este producto'),
            t.k0s(),
            t.j41(3, 'mat-select', 19),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return t.DH7(a.decision, e) || (a.decision = e), c.Njj(e);
            }),
            t.j41(4, 'mat-option', 20),
            t.EFF(5, 'Definir y enviar plan'),
            t.k0s(),
            t.j41(6, 'mat-option', 21),
            t.EFF(7, 'Rechazar y cerrar por pol\xedtica'),
            t.k0s()()();
        }
        if (2 & n) {
          const o = t.XpG(2).$implicit;
          t.R7$(3), t.R50('ngModel', o.decision);
        }
      }
      function $(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Motivo'),
            t.k0s(),
            t.j41(3, 'mat-select', 19),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return (
                t.DH7(a.tipoAccionRespuesta, e) || (a.tipoAccionRespuesta = e),
                c.Njj(e)
              );
            }),
            t.j41(4, 'mat-option', 22),
            t.EFF(5, 'Reubicaci\xf3n'),
            t.k0s(),
            t.j41(6, 'mat-option', 23),
            t.EFF(7, 'Cambio x Cambio'),
            t.k0s(),
            t.j41(8, 'mat-option', 24),
            t.EFF(9, 'Devoluci\xf3n'),
            t.k0s(),
            t.j41(10, 'mat-option', 25),
            t.EFF(11, 'Descuento'),
            t.k0s(),
            t.j41(12, 'mat-option', 26),
            t.EFF(13, 'Promoci\xf3n'),
            t.k0s(),
            t.j41(14, 'mat-option', 27),
            t.EFF(15, 'Degustaci\xf3n'),
            t.k0s(),
            t.j41(16, 'mat-option', 28),
            t.EFF(17, 'Nota de cr\xe9dito'),
            t.k0s(),
            t.j41(18, 'mat-option', 29),
            t.EFF(19, 'Otro'),
            t.k0s()()(),
            t.j41(20, 'mat-form-field', 14)(21, 'mat-label'),
            t.EFF(22, 'Plan de acci\xf3n'),
            t.k0s(),
            t.j41(23, 'textarea', 30),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return (
                t.DH7(a.descripcionPlanRespuesta, e) ||
                  (a.descripcionPlanRespuesta = e),
                c.Njj(e)
              );
            }),
            t.k0s()(),
            t.j41(24, 'div', 31)(25, 'mat-form-field', 14)(26, 'mat-label'),
            t.EFF(27, 'Fecha compromiso'),
            t.k0s(),
            t.j41(28, 'input', 32),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return (
                t.DH7(a.fechaCompromisoRespuesta, e) ||
                  (a.fechaCompromisoRespuesta = e),
                c.Njj(e)
              );
            }),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.sdS(31);
              return c.Njj(e.open());
            }),
            t.k0s(),
            t.nrm(29, 'mat-datepicker-toggle', 33)(
              30,
              'mat-datepicker',
              null,
              0,
            ),
            t.k0s(),
            t.j41(32, 'mat-form-field', 14)(33, 'mat-label'),
            t.EFF(34, 'Responsable'),
            t.k0s(),
            t.j41(35, 'input', 34),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return (
                t.DH7(a.responsableRespuesta, e) ||
                  (a.responsableRespuesta = e),
                c.Njj(e)
              );
            }),
            t.k0s()()();
        }
        if (2 & n) {
          const o = t.sdS(31),
            i = t.XpG(2).$implicit,
            e = t.XpG(3);
          t.R7$(3),
            t.R50('ngModel', i.tipoAccionRespuesta),
            t.R7$(20),
            t.R50('ngModel', i.descripcionPlanRespuesta),
            t.R7$(5),
            t.Y8G('min', e.minFecha)('matDatepicker', o),
            t.R50('ngModel', i.fechaCompromisoRespuesta),
            t.R7$(),
            t.Y8G('for', o),
            t.R7$(6),
            t.R50('ngModel', i.responsableRespuesta);
        }
      }
      function X(n, r) {
        if (
          (1 & n &&
            (t.nVh(0, D, 8, 1, 'mat-form-field', 14), t.nVh(1, $, 36, 7)),
          2 & n)
        ) {
          const o = t.XpG().$implicit;
          t.vxM(o.EsRechazablePolitica ? 0 : -1),
            t.R7$(),
            t.vxM('RECHAZAR_CERRAR_POLITICA' !== o.decision ? 1 : -1);
        }
      }
      function B(n, r) {
        1 & n &&
          (t.j41(0, 'mat-option', 21),
          t.EFF(1, 'Rechazar y cerrar por pol\xedtica'),
          t.k0s());
      }
      function J(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Decisi\xf3n para este producto'),
            t.k0s(),
            t.j41(3, 'mat-select', 19),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2).$implicit;
              return t.DH7(a.decision, e) || (a.decision = e), c.Njj(e);
            }),
            t.j41(4, 'mat-option', 36),
            t.EFF(5, 'Aprobar'),
            t.k0s(),
            t.j41(6, 'mat-option', 37),
            t.EFF(7, 'Rechazar y devolver al Jefe de Marca'),
            t.k0s(),
            t.nVh(8, B, 2, 0, 'mat-option', 21),
            t.k0s()();
        }
        if (2 & n) {
          const o = t.XpG(2).$implicit;
          t.R7$(3),
            t.R50('ngModel', o.decision),
            t.R7$(5),
            t.vxM(o.EsRechazablePolitica ? 8 : -1);
        }
      }
      function z(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'section', 35)(1, 'span'),
            t.EFF(2, 'Motivo que est\xe1 aprobando'),
            t.k0s(),
            t.j41(3, 'h2'),
            t.EFF(4),
            t.k0s(),
            t.j41(5, 'p'),
            t.EFF(6),
            t.k0s(),
            t.j41(7, 'dl')(8, 'div')(9, 'dt'),
            t.EFF(10, 'Responsable'),
            t.k0s(),
            t.j41(11, 'dd'),
            t.EFF(12),
            t.k0s()(),
            t.j41(13, 'div')(14, 'dt'),
            t.EFF(15, 'Fecha compromiso'),
            t.k0s(),
            t.j41(16, 'dd'),
            t.EFF(17),
            t.nI1(18, 'date'),
            t.k0s()(),
            t.j41(19, 'div')(20, 'dt'),
            t.EFF(21, 'Estado'),
            t.k0s(),
            t.j41(22, 'dd'),
            t.EFF(23),
            t.k0s()()()(),
            t.nVh(24, J, 9, 2, 'mat-form-field', 14)),
          2 & n)
        ) {
          const o = t.XpG().$implicit,
            i = t.XpG(3);
          t.R7$(4),
            t.JRh(
              null == o.TipoAccion ? null : o.TipoAccion.replaceAll('_', ' '),
            ),
            t.R7$(2),
            t.JRh(o.PlanAccion),
            t.R7$(6),
            t.JRh(o.Responsable || 'No indicado'),
            t.R7$(5),
            t.JRh(t.i5U(18, 6, o.FechaCompromiso, 'dd/MM/yyyy')),
            t.R7$(6),
            t.JRh(
              null == o.PlanEstado ? null : o.PlanEstado.replaceAll('_', ' '),
            ),
            t.R7$(),
            t.vxM(i.esEjecucion ? -1 : 24);
        }
      }
      function H(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'article', 13)(1, 'header')(2, 'div')(3, 'small'),
            t.EFF(4),
            t.k0s(),
            t.j41(5, 'h2'),
            t.EFF(6),
            t.k0s()(),
            t.j41(7, 'span'),
            t.EFF(8),
            t.k0s()(),
            t.j41(9, 'dl')(10, 'div')(11, 'dt'),
            t.EFF(12, 'Casa / Marca'),
            t.k0s(),
            t.j41(13, 'dd'),
            t.EFF(14),
            t.k0s()(),
            t.j41(15, 'div')(16, 'dt'),
            t.EFF(17, 'Lote'),
            t.k0s(),
            t.j41(18, 'dd'),
            t.EFF(19),
            t.k0s()(),
            t.j41(20, 'div')(21, 'dt'),
            t.EFF(22, 'Vencimiento'),
            t.k0s(),
            t.j41(23, 'dd'),
            t.EFF(24),
            t.nI1(25, 'date'),
            t.k0s()(),
            t.j41(26, 'div')(27, 'dt'),
            t.EFF(28, 'Cantidad'),
            t.k0s(),
            t.j41(29, 'dd'),
            t.EFF(30),
            t.k0s()()(),
            t.nVh(31, G, 9, 4, 'section', 16),
            t.nVh(32, N, 8, 2, 'section', 17),
            t.nVh(33, X, 2, 2)(34, z, 25, 9),
            t.j41(35, 'mat-form-field', 14)(36, 'mat-label'),
            t.EFF(37, 'Comentario de este producto (opcional)'),
            t.k0s(),
            t.j41(38, 'textarea', 18),
            t.mxI('ngModelChange', function (e) {
              const a = c.eBV(o).$implicit;
              return (
                t.DH7(a.comentarioRespuesta, e) || (a.comentarioRespuesta = e),
                c.Njj(e)
              );
            }),
            t.k0s()()();
        }
        if (2 & n) {
          const o = r.$implicit,
            i = t.XpG(3);
          t.R7$(4),
            t.SpI('Producto ', o.Ocurrencia),
            t.R7$(2),
            t.Lme(
              '',
              o.CodigoArticulo,
              ' \xb7 ',
              o.Articulo || 'Art\xedculo sin descripci\xf3n',
            ),
            t.R7$(2),
            t.JRh(o.Estado.replaceAll('_', ' ')),
            t.R7$(6),
            t.Lme('', o.Casa || '\u2014', ' / ', o.Marca || '\u2014'),
            t.R7$(5),
            t.JRh(o.Lote || '\u2014'),
            t.R7$(5),
            t.JRh(t.i5U(25, 13, o.FechaVencimiento, 'dd/MM/yyyy')),
            t.R7$(6),
            t.JRh(o.Cantidad ?? '\u2014'),
            t.R7$(),
            t.vxM(o.EsRechazablePolitica && !i.esEjecucion ? 31 : -1),
            t.R7$(),
            t.vxM(
              i.esPlan &&
                o.OmiteMercadeo &&
                'RECHAZAR_CERRAR_POLITICA' !== o.decision
                ? 32
                : -1,
            ),
            t.R7$(),
            t.vxM(i.esPlan ? 33 : 34),
            t.R7$(5),
            t.R50('ngModel', o.comentarioRespuesta);
        }
      }
      function U(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Correos relacionados (CC)'),
            t.k0s(),
            t.j41(3, 'input', 38),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return t.DH7(a.correosCc, e) || (a.correosCc = e), c.Njj(e);
            }),
            t.k0s(),
            t.j41(4, 'mat-hint'),
            t.EFF(5, 'Separe varios correos con coma o punto y coma.'),
            t.k0s()();
        }
        if (2 & n) {
          const o = t.XpG(3);
          t.R7$(3), t.R50('ngModel', o.correosCc);
        }
      }
      function S(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'p'),
            t.nVh(1, b, 1, 0)(2, y, 1, 0)(3, I, 1, 0),
            t.k0s(),
            t.nVh(4, V, 4, 0, 'button', 11),
            t.j41(5, 'div', 12),
            t.Z7z(6, H, 39, 16, 'article', 13, x),
            t.k0s(),
            t.nVh(8, U, 6, 1, 'mat-form-field', 14)),
          2 & n)
        ) {
          const o = t.XpG(2);
          t.R7$(),
            t.vxM(o.esPlan ? 1 : o.esEjecucion ? 2 : 3),
            t.R7$(3),
            t.vxM(o.esPlan && o.productos.length > 1 ? 4 : -1),
            t.R7$(2),
            t.Dyx(o.productos),
            t.R7$(2),
            t.vxM(o.esEjecucion ? 8 : -1);
        }
      }
      function w(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Motivo'),
            t.k0s(),
            t.j41(3, 'mat-select', 19),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return t.DH7(a.tipoAccion, e) || (a.tipoAccion = e), c.Njj(e);
            }),
            t.j41(4, 'mat-option', 22),
            t.EFF(5, 'Reubicaci\xf3n'),
            t.k0s(),
            t.j41(6, 'mat-option', 23),
            t.EFF(7, 'Cambio x Cambio'),
            t.k0s(),
            t.j41(8, 'mat-option', 24),
            t.EFF(9, 'Devoluci\xf3n'),
            t.k0s(),
            t.j41(10, 'mat-option', 25),
            t.EFF(11, 'Descuento'),
            t.k0s(),
            t.j41(12, 'mat-option', 26),
            t.EFF(13, 'Promoci\xf3n'),
            t.k0s(),
            t.j41(14, 'mat-option', 27),
            t.EFF(15, 'Degustaci\xf3n'),
            t.k0s(),
            t.j41(16, 'mat-option', 28),
            t.EFF(17, 'Nota de cr\xe9dito'),
            t.k0s(),
            t.j41(18, 'mat-option', 29),
            t.EFF(19, 'Otro'),
            t.k0s()()(),
            t.j41(20, 'mat-form-field', 14)(21, 'mat-label'),
            t.EFF(22, 'Plan de acci\xf3n'),
            t.k0s(),
            t.j41(23, 'textarea', 39),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return (
                t.DH7(a.descripcionPlan, e) || (a.descripcionPlan = e), c.Njj(e)
              );
            }),
            t.k0s()(),
            t.j41(24, 'mat-form-field', 14)(25, 'mat-label'),
            t.EFF(26, 'Fecha compromiso'),
            t.k0s(),
            t.j41(27, 'input', 32),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return (
                t.DH7(a.fechaCompromiso, e) || (a.fechaCompromiso = e), c.Njj(e)
              );
            }),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.sdS(30);
              return c.Njj(e.open());
            }),
            t.k0s(),
            t.nrm(28, 'mat-datepicker-toggle', 33)(
              29,
              'mat-datepicker',
              null,
              1,
            ),
            t.k0s(),
            t.j41(31, 'mat-form-field', 14)(32, 'mat-label'),
            t.EFF(33, 'Responsable'),
            t.k0s(),
            t.j41(34, 'input', 34),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return t.DH7(a.responsable, e) || (a.responsable = e), c.Njj(e);
            }),
            t.k0s()();
        }
        if (2 & n) {
          const o = t.sdS(30),
            i = t.XpG(3);
          t.R7$(3),
            t.R50('ngModel', i.tipoAccion),
            t.R7$(20),
            t.R50('ngModel', i.descripcionPlan),
            t.R7$(4),
            t.Y8G('min', i.minFecha)('matDatepicker', o),
            t.R50('ngModel', i.fechaCompromiso),
            t.R7$(),
            t.Y8G('for', o),
            t.R7$(6),
            t.R50('ngModel', i.responsable);
        }
      }
      function L(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'section', 35)(1, 'span'),
            t.EFF(2, 'Motivo que est\xe1 aprobando'),
            t.k0s(),
            t.j41(3, 'h2'),
            t.EFF(4),
            t.k0s(),
            t.j41(5, 'p'),
            t.EFF(6),
            t.k0s()()),
          2 & n)
        ) {
          const o = t.XpG(3);
          t.R7$(4),
            t.JRh(
              null == o.ticket.TipoAccion
                ? null
                : o.ticket.TipoAccion.replaceAll('_', ' '),
            ),
            t.R7$(2),
            t.JRh(o.ticket.PlanDescripcion);
        }
      }
      function Y(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'mat-form-field', 14)(1, 'mat-label'),
            t.EFF(2, 'Correos relacionados (CC)'),
            t.k0s(),
            t.j41(3, 'input', 34),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(3);
              return t.DH7(a.correosCc, e) || (a.correosCc = e), c.Njj(e);
            }),
            t.k0s()();
        }
        if (2 & n) {
          const o = t.XpG(3);
          t.R7$(3), t.R50('ngModel', o.correosCc);
        }
      }
      function Z(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'p'),
            t.EFF(1, 'Este ticket conserva el flujo general anterior.'),
            t.k0s(),
            t.nVh(2, w, 35, 7)(3, L, 7, 2, 'section', 35),
            t.nVh(4, Y, 4, 1, 'mat-form-field', 14),
            t.j41(5, 'mat-form-field', 14)(6, 'mat-label'),
            t.EFF(7, 'Comentario (opcional)'),
            t.k0s(),
            t.j41(8, 'textarea', 30),
            t.mxI('ngModelChange', function (e) {
              c.eBV(o);
              const a = t.XpG(2);
              return t.DH7(a.comentario, e) || (a.comentario = e), c.Njj(e);
            }),
            t.k0s()();
        }
        if (2 & n) {
          const o = t.XpG(2);
          t.R7$(2),
            t.vxM(o.esPlan ? 2 : o.ticket.PlanDescripcion ? 3 : -1),
            t.R7$(2),
            t.vxM(o.esEjecucion ? 4 : -1),
            t.R7$(4),
            t.R50('ngModel', o.comentario);
        }
      }
      function Q(n, r) {
        if ((1 & n && (t.j41(0, 'p', 9), t.EFF(1), t.k0s()), 2 & n)) {
          const o = t.XpG(2);
          t.R7$(), t.JRh(o.error);
        }
      }
      function K(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'button', 40),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.XpG(2);
              return c.Njj(e.responder('PROPONER_PLAN'));
            }),
            t.EFF(1, 'Registrar planes y decisiones'),
            t.k0s();
        }
        if (2 & n) {
          const o = t.XpG(2);
          t.Y8G('disabled', o.submitting);
        }
      }
      function W(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'button', 40),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.XpG(2);
              return c.Njj(e.responder('INICIAR_EJECUCION'));
            }),
            t.EFF(1, 'Iniciar ejecuci\xf3n y notificar al vendedor'),
            t.k0s();
        }
        if (2 & n) {
          const o = t.XpG(2);
          t.Y8G('disabled', o.submitting);
        }
      }
      function q(n, r) {
        if (1 & n) {
          const o = t.RV6();
          t.j41(0, 'button', 40),
            t.bIt('click', function () {
              c.eBV(o);
              const e = t.XpG(2);
              return c.Njj(e.responder('APROBAR'));
            }),
            t.EFF(1, 'Registrar decisiones'),
            t.k0s();
        }
        if (2 & n) {
          const o = t.XpG(2);
          t.Y8G('disabled', o.submitting);
        }
      }
      function tt(n, r) {
        if (
          (1 & n &&
            (t.j41(0, 'section', 7)(1, 'span'),
            t.EFF(2, 'Acci\xf3n requerida'),
            t.k0s(),
            t.j41(3, 'h1'),
            t.EFF(4),
            t.k0s(),
            t.j41(5, 'p')(6, 'strong'),
            t.EFF(7, 'Cliente:'),
            t.k0s(),
            t.EFF(8),
            t.nrm(9, 'br'),
            t.j41(10, 'strong'),
            t.EFF(11, 'Asunto:'),
            t.k0s(),
            t.EFF(12),
            t.k0s(),
            t.nVh(13, S, 9, 3)(14, Z, 9, 3),
            t.nVh(15, Q, 2, 1, 'p', 9),
            t.j41(16, 'footer'),
            t.nVh(17, K, 2, 1, 'button', 10)(18, W, 2, 1, 'button', 10)(
              19,
              q,
              2,
              1,
              'button',
              10,
            ),
            t.k0s()()),
          2 & n)
        ) {
          const o = t.XpG();
          t.R7$(4),
            t.JRh(o.ticket.NumeroTicket),
            t.R7$(4),
            t.SpI(' ', o.ticket.NombreCliente),
            t.R7$(4),
            t.SpI(' ', o.ticket.Titulo),
            t.R7$(),
            t.vxM(o.productos.length ? 13 : 14),
            t.R7$(2),
            t.vxM(o.error ? 15 : -1),
            t.R7$(2),
            t.vxM(o.esPlan ? 17 : o.esEjecucion ? 18 : 19);
        }
      }
      const ot = [
        {
          path: '',
          component: (() => {
            class n {
              constructor(o, i) {
                (this.route = o),
                  (this.tickets = i),
                  (this.token = ''),
                  (this.comentario = ''),
                  (this.tipoAccion = 'REUBICACION'),
                  (this.descripcionPlan = ''),
                  (this.fechaCompromiso = null),
                  (this.responsable = ''),
                  (this.correosCc = ''),
                  (this.loading = !0),
                  (this.submitting = !1),
                  (this.completed = !1),
                  (this.error = ''),
                  (this.minFecha = this.today());
              }
              ngOnInit() {
                if (
                  ((this.token =
                    this.route.snapshot.queryParamMap
                      .get('token')
                      ?.replace(/\s+/g, '') ?? ''),
                  !this.token)
                )
                  return (
                    (this.loading = !1),
                    void (this.error =
                      'El enlace no contiene un c\xf3digo v\xe1lido.')
                  );
                this.tickets
                  .getAprobacion(this.token)
                  .pipe((0, u.j)(() => (this.loading = !1)))
                  .subscribe({
                    next: (o) => {
                      this.ticket = o;
                      this.correosCc = Array.isArray(o.correosCcSugeridos)
                        ? o.correosCcSugeridos.join(', ')
                        : '';
                      for (const i of o.Productos ?? [])
                        (i.decision =
                          'JEFE_MARCA' === o.Etapa
                            ? 'PROPONER_PLAN'
                            : 'APROBAR'),
                          (i.accionCierre = 'CERRAR'),
                          (i.tipoAccionRespuesta = 'REUBICACION'),
                          (i.comentarioRespuesta = '');
                    },
                    error: (o) => (this.error = this.message(o)),
                  });
              }
              get esPlan() {
                return 'JEFE_MARCA' === this.ticket?.Etapa;
              }
              get esEjecucion() {
                return 'EJECUCION' === this.ticket?.Etapa;
              }
              get productos() {
                return this.ticket?.Productos ?? [];
              }
              aplicarPrimerPlanATodos() {
                const o = this.productos[0];
                if (o)
                  for (const i of this.productos.slice(1))
                    (i.tipoAccionRespuesta = o.tipoAccionRespuesta),
                      (i.descripcionPlanRespuesta = o.descripcionPlanRespuesta),
                      (i.fechaCompromisoRespuesta = o.fechaCompromisoRespuesta),
                      (i.responsableRespuesta = o.responsableRespuesta);
              }
              responder(o) {
                if (!this.ticket || this.submitting || this.completed) return;
                if (this.productos.length) {
                  if (
                    this.productos.some(
                      (l) =>
                        this.esPlan &&
                        'RECHAZAR_CERRAR_POLITICA' !== l.decision &&
                        (!l.descripcionPlanRespuesta?.trim() ||
                          !l.fechaCompromisoRespuesta ||
                          !l.responsableRespuesta?.trim()),
                    )
                  )
                    return void (this.error =
                      'Complete la decisi\xf3n y los campos requeridos de todos los productos.');
                  const a = {
                    token: this.token,
                    decision: o,
                    comentario: 'Respuesta registrada por producto.',
                    productos: this.productos.map((l) => ({
                      idTicketProducto: l.IdTicketProducto,
                      decision: this.esPlan
                        ? l.decision ?? 'PROPONER_PLAN'
                        : this.esEjecucion
                        ? 'INICIAR_EJECUCION'
                        : l.decision ?? 'APROBAR',
                      comentario: l.comentarioRespuesta?.trim() ?? '',
                      ...(this.esPlan &&
                      'RECHAZAR_CERRAR_POLITICA' !== l.decision
                        ? {
                            tipoAccion: l.tipoAccionRespuesta,
                            descripcionPlan: l.descripcionPlanRespuesta.trim(),
                            fechaCompromiso: this.fechaIso(
                              l.fechaCompromisoRespuesta,
                            ),
                            responsable: l.responsableRespuesta.trim(),
                          }
                        : {}),
                    })),
                    ...(this.esEjecucion
                      ? {
                          correosCc: this.correosCc
                            .split(/[;,\s]+/)
                            .map((l) => l.trim())
                            .filter(Boolean),
                        }
                      : {}),
                  };
                  return void this.enviar(a);
                }
                if (
                  this.esPlan &&
                  (!this.descripcionPlan.trim() ||
                    !this.fechaCompromiso ||
                    !this.responsable.trim())
                )
                  return void (this.error =
                    'Complete los campos requeridos antes de continuar.');
                const i = {
                  token: this.token,
                  decision: o,
                  comentario: this.comentario.trim(),
                  ...(this.esPlan
                    ? {
                        tipoAccion: this.tipoAccion,
                        descripcionPlan: this.descripcionPlan.trim(),
                        fechaCompromiso: this.fechaIso(this.fechaCompromiso),
                        responsable: this.responsable.trim(),
                      }
                    : {}),
                  ...(this.esEjecucion
                    ? {
                        correosCc: this.correosCc
                          .split(/[;,\s]+/)
                          .map((e) => e.trim())
                          .filter(Boolean),
                      }
                    : {}),
                };
                this.enviar(i);
              }
              enviar(o) {
                (this.error = ''),
                  (this.submitting = !0),
                  this.tickets
                    .responderAprobacion(o)
                    .pipe((0, u.j)(() => (this.submitting = !1)))
                    .subscribe({
                      next: (i) => {
                        (this.completed = !0),
                          (this.ticket = { ...this.ticket, Estado: i.estado });
                      },
                      error: (i) => (this.error = this.message(i)),
                    });
              }
              fechaIso(o) {
                if (!o) return '';
                const i = o instanceof Date ? o : new Date(o);
                return new Date(
                  Date.UTC(i.getFullYear(), i.getMonth(), i.getDate()),
                )
                  .toISOString()
                  .slice(0, 10);
              }
              today() {
                const o = new Date();
                return o.setHours(0, 0, 0, 0), o;
              }
              message(o) {
                return 404 === o.status
                  ? 'El enlace no existe.'
                  : 409 === o.status
                  ? 'El enlace ya fue utilizado o el ticket cambi\xf3 de estado.'
                  : 410 === o.status
                  ? 'El enlace venci\xf3.'
                  : o?.error?.message ??
                    'No fue posible procesar la respuesta.';
              }
              static {
                this.ɵfac = function (i) {
                  return new (i || n)(t.rXU(f.nX), t.rXU(F.t));
                };
              }
              static {
                this.ɵcmp = t.VBU({
                  type: n,
                  selectors: [['app-ticket-approval']],
                  standalone: !1,
                  decls: 14,
                  vars: 1,
                  consts: [
                    ['productPicker', ''],
                    ['legacyPicker', ''],
                    [1, 'approval-page'],
                    [1, 'approval-card'],
                    [1, 'state'],
                    [1, 'state', 'error'],
                    [1, 'state', 'success'],
                    [1, 'content'],
                    ['diameter', '46'],
                    [1, 'inline-error'],
                    ['mat-flat-button', '', 'color', 'primary', 3, 'disabled'],
                    [
                      'mat-stroked-button',
                      '',
                      'type',
                      'button',
                      1,
                      'copy-plan',
                    ],
                    [1, 'products'],
                    [1, 'product-card'],
                    ['appearance', 'outline'],
                    [
                      'mat-stroked-button',
                      '',
                      'type',
                      'button',
                      1,
                      'copy-plan',
                      3,
                      'click',
                    ],
                    [1, 'policy-warning'],
                    [1, 'special-approval'],
                    [
                      'matInput',
                      '',
                      'rows',
                      '2',
                      3,
                      'ngModelChange',
                      'ngModel',
                    ],
                    [3, 'ngModelChange', 'ngModel'],
                    ['value', 'PROPONER_PLAN'],
                    ['value', 'RECHAZAR_CERRAR_POLITICA'],
                    ['value', 'REUBICACION'],
                    ['value', 'CAMBIO'],
                    ['value', 'DEVOLUCION'],
                    ['value', 'DESCUENTO'],
                    ['value', 'PROMOCION'],
                    ['value', 'DEGUSTACION'],
                    ['value', 'NOTA_CREDITO'],
                    ['value', 'OTRO'],
                    [
                      'matInput',
                      '',
                      'rows',
                      '3',
                      3,
                      'ngModelChange',
                      'ngModel',
                    ],
                    [1, 'plan-fields'],
                    [
                      'matInput',
                      '',
                      'readonly',
                      '',
                      3,
                      'ngModelChange',
                      'click',
                      'min',
                      'matDatepicker',
                      'ngModel',
                    ],
                    ['matIconSuffix', '', 3, 'for'],
                    ['matInput', '', 3, 'ngModelChange', 'ngModel'],
                    [1, 'plan-summary'],
                    ['value', 'APROBAR'],
                    ['value', 'RECHAZAR'],
                    [
                      'matInput',
                      '',
                      'placeholder',
                      'persona@empresa.com; otra@empresa.com',
                      3,
                      'ngModelChange',
                      'ngModel',
                    ],
                    [
                      'matInput',
                      '',
                      'rows',
                      '4',
                      3,
                      'ngModelChange',
                      'ngModel',
                    ],
                    [
                      'mat-flat-button',
                      '',
                      'color',
                      'primary',
                      3,
                      'click',
                      'disabled',
                    ],
                  ],
                  template: function (i, e) {
                    1 & i &&
                      (t.j41(0, 'main', 2)(1, 'section', 3)(2, 'header')(
                        3,
                        'mat-icon',
                      ),
                      t.EFF(4, 'confirmation_number'),
                      t.k0s(),
                      t.j41(5, 'div')(6, 'strong'),
                      t.EFF(7, 'PACO'),
                      t.k0s(),
                      t.j41(8, 'span'),
                      t.EFF(9, 'Gesti\xf3n de ticket por producto'),
                      t.k0s()()(),
                      t.nVh(10, v, 4, 0, 'div', 4)(11, T, 7, 1, 'div', 5)(
                        12,
                        O,
                        12,
                        2,
                        'div',
                        6,
                      )(13, tt, 20, 6, 'section', 7),
                      t.k0s()()),
                      2 & i &&
                        (t.R7$(10),
                        t.vxM(
                          e.loading
                            ? 10
                            : e.error && !e.ticket
                            ? 11
                            : e.ticket && e.completed
                            ? 12
                            : e.ticket
                            ? 13
                            : -1,
                        ));
                  },
                  dependencies: [
                    p.rl,
                    p.nJ,
                    p.MV,
                    p.yw,
                    k.fg,
                    h.$z,
                    d.me,
                    d.BC,
                    R.LG,
                    M.An,
                    d.vS,
                    E.VO,
                    j.wT,
                    _.Vh,
                    _.bZ,
                    _.bU,
                    P.vh,
                  ],
                  styles: [
                    '.approval-page[_ngcontent-%COMP%]{min-height:100vh;background:#f3f6f4;display:grid;place-items:center;padding:1.5rem}.approval-card[_ngcontent-%COMP%]{width:min(100%,900px);background:#fff;border-radius:16px;box-shadow:0 5px 24px #102a4320;overflow:hidden}.approval-card[_ngcontent-%COMP%] > header[_ngcontent-%COMP%]{padding:1.25rem 1.5rem;background:#0b8f4d;color:#fff;display:flex;gap:.7rem;align-items:center}.approval-card[_ngcontent-%COMP%]   header[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{display:flex;flex-direction:column}.content[_ngcontent-%COMP%]{padding:1.5rem}.content[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{color:#0b8f4d;font-weight:700}.content[_ngcontent-%COMP%]   mat-form-field[_ngcontent-%COMP%]{display:block;width:100%}.plan-summary[_ngcontent-%COMP%]{margin:1rem 0 1.25rem;padding:1rem;border:1px solid #d9c7f1;border-radius:12px;background:#faf7ff}.plan-summary[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{color:#7040a8;font-size:.75rem;font-weight:800;text-transform:uppercase}.plan-summary[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:.25rem 0;color:#432266;text-transform:capitalize}.plan-summary[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{white-space:pre-wrap}.plan-summary[_ngcontent-%COMP%]   dl[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:1rem 0 0}.plan-summary[_ngcontent-%COMP%]   dl[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{display:flex;flex-direction:column}.plan-summary[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%]{color:#71667c;font-size:.72rem}.plan-summary[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%]{margin:0;font-weight:700;text-transform:capitalize}.state[_ngcontent-%COMP%]{text-align:center;padding:3rem 1.5rem}.state[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{font-size:42px;width:42px;height:42px}.success[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{color:#0b8f4d}.error[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%], .inline-error[_ngcontent-%COMP%]{color:#b42318}.content[_ngcontent-%COMP%]   footer[_ngcontent-%COMP%]{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1rem}.copy-plan[_ngcontent-%COMP%]{margin:0 0 1rem}.products[_ngcontent-%COMP%]{display:grid;gap:1rem;margin:1rem 0}.product-card[_ngcontent-%COMP%]{padding:1rem;border:1px solid #dce4e0;border-radius:14px;background:#fbfdfc}.product-card[_ngcontent-%COMP%] > header[_ngcontent-%COMP%]{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:.8rem}.product-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:.2rem 0;color:#173f31;font-size:1rem}.product-card[_ngcontent-%COMP%]   small[_ngcontent-%COMP%]{color:#0b8f4d;font-weight:700}.product-card[_ngcontent-%COMP%] > header[_ngcontent-%COMP%] > span[_ngcontent-%COMP%]{padding:.3rem .55rem;border-radius:999px;background:#e5f4eb;color:#087540;font-size:.7rem;font-weight:700}.product-card[_ngcontent-%COMP%] > dl[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin:0 0 1rem}.product-card[_ngcontent-%COMP%] > dl[_ngcontent-%COMP%]   div[_ngcontent-%COMP%]{display:flex;flex-direction:column}.product-card[_ngcontent-%COMP%]   dt[_ngcontent-%COMP%]{color:#69766f;font-size:.7rem}.product-card[_ngcontent-%COMP%]   dd[_ngcontent-%COMP%]{margin:0;font-weight:600}.plan-fields[_ngcontent-%COMP%]{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.policy-warning[_ngcontent-%COMP%]{display:flex;gap:.75rem;margin:0 0 1rem;padding:.85rem;border:1px solid #e5a29b;border-radius:10px;background:#fff5f4;color:#8f2018}.policy-warning[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{flex:0 0 auto}.policy-warning[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:.2rem 0 0;color:#6f3631;font-size:.82rem}.special-approval[_ngcontent-%COMP%]{display:flex;gap:.75rem;margin:0 0 1rem;padding:.85rem;border:1px solid #91b7db;border-radius:10px;background:#f2f8fd;color:#174f7d}.special-approval[_ngcontent-%COMP%]   mat-icon[_ngcontent-%COMP%]{flex:0 0 auto}.special-approval[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{margin:.2rem 0 0;color:#365f80;font-size:.82rem}@media(max-width:600px){.plan-summary[_ngcontent-%COMP%]   dl[_ngcontent-%COMP%]{grid-template-columns:1fr}.product-card[_ngcontent-%COMP%] > dl[_ngcontent-%COMP%], .plan-fields[_ngcontent-%COMP%]{grid-template-columns:1fr 1fr}}',
                  ],
                });
              }
            }
            return n;
          })(),
        },
      ];
      let nt = (() => {
          class n {
            static {
              this.ɵfac = function (i) {
                return new (i || n)();
              };
            }
            static {
              this.ɵmod = t.$C({ type: n });
            }
            static {
              this.ɵinj = c.G2t({ imports: [m.iI.forChild(ot), m.iI] });
            }
          }
          return n;
        })(),
        et = (() => {
          class n {
            static {
              this.ɵfac = function (i) {
                return new (i || n)();
              };
            }
            static {
              this.ɵmod = t.$C({ type: n });
            }
            static {
              this.ɵinj = c.G2t({ imports: [g.G, nt] });
            }
          }
          return n;
        })();
    },
  },
]);
