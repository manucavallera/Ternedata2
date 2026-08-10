"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { useSuperAdminUsers } from "@/hooks/useSuperAdminUsers";
import {
  filterGlobalUsers,
  getAssignedEstablishments,
} from "./superAdminUsersViewModel.mjs";

const ROLES = ["admin", "veterinario", "operario", "super_admin"];

const isSuccess = (status) => status >= 200 && status < 300;

const getErrorMessage = (response, fallback) => {
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(". ") : message || fallback;
};

export const SuperAdminUsersPanel = () => {
  const { listGlobalUsers, changeUserRole, toggleUserStatus } =
    useSuperAdminUsers();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await listGlobalUsers();

    if (isSuccess(response.status) && Array.isArray(response.data)) {
      setUsers(response.data);
      setLoading(false);
      return true;
    }

    setError(
      getErrorMessage(response, "No se pudieron cargar los usuarios globales"),
    );
    setLoading(false);
    return false;
  }, [listGlobalUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(
    () =>
      filterGlobalUsers(users, {
        role: roleFilter,
        status: statusFilter,
      }),
    [roleFilter, statusFilter, users],
  );

  const handleRoleChange = async (user, nextRole) => {
    if (nextRole === user.rol) return;
    if (
      !window.confirm(
        `¿Cambiar el rol de ${user.email} de ${user.rol} a ${nextRole}?`,
      )
    ) {
      return;
    }

    setPendingAction(`role-${user.id}`);
    setError("");
    setNotice("");
    const response = await changeUserRole(user.id, nextRole);
    if (isSuccess(response.status)) {
      const refreshed = await loadUsers();
      if (refreshed) setNotice("Rol actualizado correctamente");
    } else {
      setError(getErrorMessage(response, "No se pudo cambiar el rol"));
    }
    setPendingAction(null);
  };

  const handleStatusChange = async (user) => {
    const action = user.estado === "activo" ? "desactivar" : "activar";
    if (!window.confirm(`¿Querés ${action} la cuenta de ${user.email}?`)) {
      return;
    }

    setPendingAction(`status-${user.id}`);
    setError("");
    setNotice("");
    const response = await toggleUserStatus(user.id);
    if (isSuccess(response.status)) {
      const refreshed = await loadUsers();
      if (refreshed) setNotice("Estado actualizado correctamente");
    } else {
      setError(getErrorMessage(response, "No se pudo cambiar el estado"));
    }
    setPendingAction(null);
  };

  return (
    <section className='rounded-lg bg-white p-4 shadow-md sm:p-6'>
      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-800'>Usuarios globales</h2>
          <p className='mt-1 text-sm text-gray-500'>
            Administración de cuentas de todos los establecimientos.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <label className='text-sm text-gray-600'>
            <span className='sr-only'>Filtrar por rol</span>
            <select
              aria-label='Filtrar por rol'
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className='rounded-md border border-gray-300 px-3 py-2'
            >
              <option value='todos'>Todos los roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role === "super_admin" ? "Super admin" : role}
                </option>
              ))}
            </select>
          </label>
          <label className='text-sm text-gray-600'>
            <span className='sr-only'>Filtrar por estado</span>
            <select
              aria-label='Filtrar por estado'
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className='rounded-md border border-gray-300 px-3 py-2'
            >
              <option value='todos'>Todos los estados</option>
              <option value='activo'>Activo</option>
              <option value='inactivo'>Inactivo</option>
            </select>
          </label>
          <button
            type='button'
            onClick={loadUsers}
            disabled={loading}
            className='rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50'
          >
            Actualizar
          </button>
        </div>
      </div>

      <div aria-live='polite'>
        {error && (
          <p role='alert' className='mb-4 rounded-md bg-red-50 p-3 text-red-700'>
            {error}
          </p>
        )}
        {notice && (
          <p className='mb-4 rounded-md bg-green-50 p-3 text-green-700'>
            {notice}
          </p>
        )}
      </div>

      {loading ? (
        <p className='py-10 text-center text-gray-500'>
          Cargando usuarios globales...
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[850px]'>
            <caption className='sr-only'>
              Usuarios globales, roles, estados y establecimientos asignados
            </caption>
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-3 text-left text-sm font-semibold text-gray-600'>
                  Usuario
                </th>
                <th className='p-3 text-left text-sm font-semibold text-gray-600'>
                  Rol
                </th>
                <th className='p-3 text-left text-sm font-semibold text-gray-600'>
                  Estado
                </th>
                <th className='p-3 text-left text-sm font-semibold text-gray-600'>
                  Establecimientos
                </th>
                <th className='p-3 text-right text-sm font-semibold text-gray-600'>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {filteredUsers.map((user) => {
                const assigned = getAssignedEstablishments(user);
                const expanded = expandedUserId === user.id;
                const rolePending = pendingAction === `role-${user.id}`;
                const statusPending = pendingAction === `status-${user.id}`;

                return (
                  <Fragment key={user.id}>
                    <tr className='align-top'>
                      <td className='p-3'>
                        <div className='font-medium text-gray-900'>
                          {user.name || "Sin nombre"}
                        </div>
                        <div className='text-sm text-gray-500'>{user.email}</div>
                      </td>
                      <td className='p-3'>
                        <select
                          aria-label={`Rol de ${user.email}`}
                          value={user.rol}
                          disabled={Boolean(pendingAction)}
                          onChange={(event) =>
                            handleRoleChange(user, event.target.value)
                          }
                          className='rounded-md border border-gray-300 px-2 py-1 capitalize disabled:opacity-50'
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role === "super_admin" ? "Super admin" : role}
                            </option>
                          ))}
                        </select>
                        {rolePending && (
                          <span className='ml-2 text-xs text-gray-500'>
                            Guardando...
                          </span>
                        )}
                      </td>
                      <td className='p-3'>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            user.estado === "activo"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.estado}
                        </span>
                      </td>
                      <td className='p-3'>
                        <button
                          type='button'
                          onClick={() =>
                            setExpandedUserId(expanded ? null : user.id)
                          }
                          className='text-sm font-medium text-blue-600 hover:text-blue-800'
                          aria-expanded={expanded}
                        >
                          {assigned.length === 1
                            ? "1 establecimiento"
                            : `${assigned.length} establecimientos`}
                        </button>
                      </td>
                      <td className='p-3 text-right'>
                        <button
                          type='button'
                          onClick={() => handleStatusChange(user)}
                          disabled={Boolean(pendingAction)}
                          className='rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                        >
                          {statusPending
                            ? "Guardando..."
                            : user.estado === "activo"
                              ? "Desactivar"
                              : "Activar"}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className='bg-blue-50/40'>
                        <td colSpan={5} className='px-6 py-4'>
                          <h3 className='mb-2 text-sm font-semibold text-gray-700'>
                            Establecimientos asignados
                          </h3>
                          {assigned.length > 0 ? (
                            <ul className='flex flex-wrap gap-2'>
                              {assigned.map((establishment) => (
                                <li
                                  key={establishment.id}
                                  className='rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm'
                                >
                                  {establishment.nombre}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className='text-sm text-gray-500'>
                              Sin establecimientos asignados.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className='p-8 text-center text-gray-500'>
                    No hay usuarios para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
