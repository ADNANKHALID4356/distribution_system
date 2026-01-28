// Company Settings Model
// Purpose: Manage company-wide configuration settings

const db = require('../config/database');

class CompanySettings {
  /**
   * Get company settings (singleton - always returns single row)
   */
  static async getSettings() {
    try {
      const [rows] = await db.query(`
        SELECT 
          id,
          company_name,
          address,
          contact,
          email,
          website,
          tax_number,
          currency,
          logo_path,
          created_at,
          updated_at
        FROM company_settings
        LIMIT 1
      `);

      // Return first row or default values if not found
      if (rows && rows.length > 0) {
        // Map to expected frontend format
        const settings = rows[0];
        return {
          id: settings.id,
          company_name: settings.company_name,
          company_address: settings.address,
          address: settings.address,
          contact: settings.contact,
          company_phone: settings.contact,
          email: settings.email,
          company_email: settings.email,
          website: settings.website,
          company_website: settings.website,
          tax_number: settings.tax_number,
          company_tax_number: settings.tax_number,
          currency: settings.currency,
          currency_code: settings.currency,
          currency_symbol: settings.currency === 'PKR' ? 'Rs.' : settings.currency,
          logo_path: settings.logo_path,
          company_logo_url: settings.logo_path,
          created_at: settings.created_at,
          updated_at: settings.updated_at
        };
      } else {
        // Return default settings if table is empty
        return {
          company_name: 'Ummahtechinnovations Distribution',
          company_address: 'Office Address, City, Pakistan',
          address: 'Office Address, City, Pakistan',
          contact: '+92-XXX-XXXXXXX',
          company_phone: '+92-XXX-XXXXXXX',
          email: 'info@ummahtechinnovations.com',
          company_email: 'info@ummahtechinnovations.com',
          website: '',
          company_website: '',
          tax_number: '',
          company_tax_number: '',
          currency: 'PKR',
          currency_code: 'PKR',
          currency_symbol: 'Rs.',
          logo_path: '',
          company_logo_url: '',
          default_tax_percentage: 0.00,
          default_credit_days: 30
        };
      }
    } catch (error) {
      console.error('❌ Error fetching company settings:', error);
      throw error;
    }
  }

  /**
   * Update company settings (updates the single row)
   */
  static async updateSettings(settingsData, userId) {
    try {
      // Check if settings row exists
      const [existing] = await db.query('SELECT id FROM company_settings LIMIT 1');

      // Map frontend field names to database column names
      const fieldMapping = {
        'company_name': 'company_name',
        'company_address': 'address',
        'address': 'address',
        'company_phone': 'contact',
        'contact': 'contact',
        'company_email': 'email',
        'email': 'email',
        'company_website': 'website',
        'website': 'website',
        'company_tax_number': 'tax_number',
        'tax_number': 'tax_number',
        'currency': 'currency',
        'currency_code': 'currency',
        'company_logo_url': 'logo_path',
        'logo_path': 'logo_path'
      };

      if (existing && existing.length > 0) {
        // Update existing settings
        const settingsId = existing[0].id;
        
        const updateFields = [];
        const updateValues = [];

        // Build dynamic UPDATE query based on provided fields
        Object.keys(fieldMapping).forEach(inputField => {
          if (settingsData.hasOwnProperty(inputField)) {
            const dbColumn = fieldMapping[inputField];
            // Avoid duplicates
            if (!updateFields.some(f => f.startsWith(dbColumn))) {
              updateFields.push(`${dbColumn} = ?`);
              updateValues.push(settingsData[inputField]);
            }
          }
        });

        if (updateFields.length > 0) {
          updateFields.push('updated_at = datetime("now")');
          updateValues.push(settingsId);

          const updateQuery = `
            UPDATE company_settings 
            SET ${updateFields.join(', ')}
            WHERE id = ?
          `;

          await db.query(updateQuery, updateValues);
        }

        return await this.getSettings();
      } else {
        // Insert new settings row (first time setup)
        const insertData = {
          company_name: settingsData.company_name || 'Company Name',
          address: settingsData.company_address || settingsData.address || '',
          contact: settingsData.company_phone || settingsData.contact || '',
          email: settingsData.company_email || settingsData.email || '',
          website: settingsData.company_website || settingsData.website || '',
          tax_number: settingsData.company_tax_number || settingsData.tax_number || '',
          currency: settingsData.currency || settingsData.currency_code || 'PKR',
          logo_path: settingsData.company_logo_url || settingsData.logo_path || ''
        };

        const insertQuery = `
          INSERT INTO company_settings (company_name, address, contact, email, website, tax_number, currency, logo_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(insertQuery, [
          insertData.company_name,
          insertData.address,
          insertData.contact,
          insertData.email,
          insertData.website,
          insertData.tax_number,
          insertData.currency,
          insertData.logo_path
        ]);
        return await this.getSettings();
      }
    } catch (error) {
      console.error('❌ Error updating company settings:', error);
      throw error;
    }
  }

  /**
   * Get company info for invoices (formatted for invoice generation)
   */
  static async getInvoiceInfo() {
    try {
      const settings = await this.getSettings();
      return {
        company_name: settings.company_name,
        company_address: settings.company_address || settings.address,
        company_phone: settings.company_phone || settings.contact,
        company_email: settings.company_email || settings.email,
        company_tax_number: settings.company_tax_number || settings.tax_number,
        company_logo_url: settings.company_logo_url || settings.logo_path
      };
    } catch (error) {
      console.error('❌ Error fetching invoice info:', error);
      throw error;
    }
  }
}

module.exports = CompanySettings;
