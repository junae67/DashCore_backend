/**
 * ARCHIVO: services/ConfigService.js
 * DESCRIPCION: Servicio para gestionar configuraciones de ERP dinámicamente
 *
 * RESPONSABILIDADES:
 * - Leer configuraciones de ERPConfig y ModuleConfig desde la BD
 * - Proporcionar configuración por defecto si no existe personalizada
 * - Aplicar fieldMappings a los datos recibidos del ERP
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuraciones por defecto para cada ERP (fallback)
const DEFAULT_CONFIGS = {
  businesscentral: {
    leads: {
      endpoint: 'salesOrders',
      displayName: 'Órdenes de Venta',
      fieldMappings: {
        leadid: 'No_',
        fullname: 'Sell_to_Customer_Name',
        companyname: 'Sell_to_Customer_Name',
        emailaddress1: 'Sell_to_E_Mail',
        estimatedvalue: 'Amount',
        createdon: 'Order_Date',
        statuscode: 'Status'
      }
    },
    contacts: {
      endpoint: 'customers',
      displayName: 'Clientes',
      fieldMappings: {
        contactid: 'No_',
        fullname: 'Name',
        emailaddress1: 'E_Mail',
        telephone1: 'Phone_No',
        address1_city: 'City',
        address1_country: 'Country_Region_Code'
      }
    },
    finance: {
      endpoint: 'salesInvoices',
      displayName: 'Facturas',
      fieldMappings: {
        invoiceid: 'No_',
        customername: 'Sell_to_Customer_Name',
        totalamount: 'Amount',
        createdon: 'Posting_Date',
        status: 'Status'
      }
    }
  },
  dynamics365: {
    leads: {
      endpoint: 'leads',
      displayName: 'Leads',
      fieldMappings: {
        leadid: 'leadid',
        fullname: 'fullname',
        companyname: 'companyname',
        emailaddress1: 'emailaddress1',
        estimatedvalue: 'estimatedvalue',
        createdon: 'createdon',
        statuscode: 'statuscode'
      }
    },
    contacts: {
      endpoint: 'contacts',
      displayName: 'Contactos',
      fieldMappings: {
        contactid: 'contactid',
        fullname: 'fullname',
        emailaddress1: 'emailaddress1',
        telephone1: 'telephone1',
        address1_city: 'address1_city',
        address1_country: 'address1_country'
      }
    },
    finance: {
      endpoint: 'invoices',
      displayName: 'Facturas',
      fieldMappings: {
        invoiceid: 'invoiceid',
        customername: 'name',
        totalamount: 'totalamount',
        createdon: 'createdon',
        status: 'statecode'
      }
    }
  },
  sap: {
    leads: {
      endpoint: 'A_SalesOrder',
      displayName: 'Órdenes de Venta',
      fieldMappings: {
        leadid: 'SalesOrder',
        fullname: 'SoldToParty',
        companyname: 'SoldToPartyName',
        emailaddress1: '',
        estimatedvalue: 'TotalNetAmount',
        createdon: 'CreationDate',
        statuscode: 'OverallSDProcessStatus'
      }
    },
    contacts: {
      endpoint: 'A_BusinessPartner',
      displayName: 'Socios Comerciales',
      fieldMappings: {
        contactid: 'BusinessPartner',
        fullname: 'BusinessPartnerFullName',
        emailaddress1: 'EmailAddress',
        telephone1: 'PhoneNumber',
        address1_city: 'CityName',
        address1_country: 'Country'
      }
    },
    finance: {
      endpoint: 'A_BillingDocument',
      displayName: 'Documentos de Facturación',
      fieldMappings: {
        invoiceid: 'BillingDocument',
        customername: 'SoldToParty',
        totalamount: 'TotalNetAmount',
        createdon: 'BillingDocumentDate',
        status: 'OverallBillingStatus'
      }
    }
  }
};

class ConfigService {
  /**
   * Obtiene la configuración de un módulo para un ERP/compañía específico
   * Prioridad: ModuleConfig de BD > DEFAULT_CONFIGS
   */
  async getModuleConfig(erpType, moduleType, companyId = null) {
    try {
      // 1. Intentar obtener configuración personalizada de la BD
      if (companyId) {
        const customConfig = await prisma.moduleConfig.findFirst({
          where: {
            moduleType: moduleType,
            erpConfig: {
              erpType: erpType,
              companyId: companyId,
              isActive: true
            }
          },
          include: {
            erpConfig: true
          }
        });

        if (customConfig && customConfig.isEnabled) {
          console.log(`📋 Usando configuración personalizada para ${erpType}/${moduleType}`);
          return {
            endpoint: customConfig.endpoint,
            displayName: customConfig.displayName,
            fieldMappings: customConfig.fieldMappings || {},
            filters: customConfig.filters || {},
            isCustom: true
          };
        }
      }

      // 2. Buscar configuración genérica del ERP (sin companyId específico)
      const genericConfig = await prisma.moduleConfig.findFirst({
        where: {
          moduleType: moduleType,
          erpConfig: {
            erpType: erpType,
            isActive: true
          }
        },
        include: {
          erpConfig: true
        }
      });

      if (genericConfig && genericConfig.isEnabled) {
        console.log(`📋 Usando configuración genérica de BD para ${erpType}/${moduleType}`);
        return {
          endpoint: genericConfig.endpoint,
          displayName: genericConfig.displayName,
          fieldMappings: genericConfig.fieldMappings || {},
          filters: genericConfig.filters || {},
          isCustom: false
        };
      }

      // 3. Usar configuración por defecto hardcodeada (fallback)
      const defaultConfig = DEFAULT_CONFIGS[erpType]?.[moduleType];
      if (defaultConfig) {
        console.log(`📋 Usando configuración por defecto para ${erpType}/${moduleType}`);
        return {
          ...defaultConfig,
          filters: {},
          isCustom: false
        };
      }

      throw new Error(`No hay configuración disponible para ${erpType}/${moduleType}`);
    } catch (error) {
      console.error(`Error obteniendo config para ${erpType}/${moduleType}:`, error);
      throw error;
    }
  }

  /**
   * Aplica el fieldMapping a un registro de datos del ERP
   * Transforma los campos del ERP a los campos estándar de DashCore
   */
  applyFieldMappings(data, fieldMappings) {
    if (!data || !fieldMappings) return data;

    const mapped = {};

    for (const [standardField, erpField] of Object.entries(fieldMappings)) {
      if (erpField && data.hasOwnProperty(erpField)) {
        mapped[standardField] = data[erpField];
      } else if (erpField && erpField.includes('.')) {
        // Soporte para campos anidados (ej: "customer.name")
        const parts = erpField.split('.');
        let value = data;
        for (const part of parts) {
          value = value?.[part];
        }
        mapped[standardField] = value;
      } else {
        mapped[standardField] = null;
      }
    }

    return mapped;
  }

  /**
   * Transforma un array de datos usando el fieldMapping
   */
  transformData(dataArray, fieldMappings, additionalFields = {}) {
    if (!Array.isArray(dataArray)) return [];

    return dataArray.map(item => {
      const mapped = this.applyFieldMappings(item, fieldMappings);
      // Agregar campos adicionales (como source, description, etc.)
      return { ...mapped, ...additionalFields };
    });
  }

  /**
   * Obtiene todas las configuraciones de módulos para un ERP
   */
  async getAllModuleConfigs(erpType, companyId = null) {
    const modules = ['leads', 'contacts', 'finance'];
    const configs = {};

    for (const moduleType of modules) {
      try {
        configs[moduleType] = await this.getModuleConfig(erpType, moduleType, companyId);
      } catch (error) {
        console.warn(`No se pudo obtener config para ${moduleType}:`, error.message);
      }
    }

    return configs;
  }

  /**
   * Verifica si un módulo está habilitado para un ERP/compañía
   */
  async isModuleEnabled(erpType, moduleType, companyId = null) {
    try {
      const config = await this.getModuleConfig(erpType, moduleType, companyId);
      return !!config;
    } catch {
      return false;
    }
  }
}

module.exports = new ConfigService();
