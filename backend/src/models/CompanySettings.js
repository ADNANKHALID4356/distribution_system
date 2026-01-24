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
          company_address,
          company_city,
          company_state,
          company_country,
          company_postal_code,
          company_phone,
          company_mobile,
          company_email,
          company_website,
          company_tax_number,
          company_registration_number,
          company_ntn,
          company_gst_number,
          bank_name,
          bank_account_title,
          bank_account_number,
          bank_branch,
          bank_iban,
          bank_swift_code,
          bank_name_2,
          bank_account_title_2,
          bank_account_number_2,
          bank_branch_2,
          bank_iban_2,
          company_logo_url,
          company_slogan,
          invoice_header_text,
          invoice_footer_text,
          currency_symbol,
          currency_code,
          default_tax_percentage,
          default_credit_days,
          created_at,
          updated_at,
          updated_by
        FROM company_settings
        LIMIT 1
      `);

      // Return first row or default values if not found
      if (rows.length > 0) {
        return rows[0];
      } else {
        // Return default settings if table is empty
        return {
          company_name: 'Ummahtechinnovations Distribution',
          company_address: 'Office Address, City, Pakistan',
          company_city: 'Lahore',
          company_country: 'Pakistan',
          company_phone: '+92-XXX-XXXXXXX',
          company_email: 'info@ummahtechinnovations.com',
          currency_symbol: 'Rs.',
          currency_code: 'PKR',
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

      if (existing.length > 0) {
        // Update existing settings
        const settingsId = existing[0].id;
        
        const updateFields = [];
        const updateValues = [];

        // Build dynamic UPDATE query based on provided fields
        const allowedFields = [
          'company_name', 'company_address', 'company_city', 'company_state',
          'company_country', 'company_postal_code', 'company_phone', 'company_mobile',
          'company_email', 'company_website', 'company_tax_number', 'company_registration_number',
          'company_ntn', 'company_gst_number', 'bank_name', 'bank_account_title',
          'bank_account_number', 'bank_branch', 'bank_iban', 'bank_swift_code',
          'bank_name_2', 'bank_account_title_2', 'bank_account_number_2',
          'bank_branch_2', 'bank_iban_2', 'company_logo_url', 'company_slogan',
          'invoice_header_text', 'invoice_footer_text', 'currency_symbol',
          'currency_code', 'default_tax_percentage', 'default_credit_days'
        ];

        allowedFields.forEach(field => {
          if (settingsData.hasOwnProperty(field)) {
            updateFields.push(`${field} = ?`);
            updateValues.push(settingsData[field]);
          }
        });

        if (updateFields.length > 0) {
          updateFields.push('updated_by = ?');
          updateValues.push(userId);
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
        const insertFields = [];
        const insertPlaceholders = [];
        const insertValues = [];

        const allowedFields = [
          'company_name', 'company_address', 'company_city', 'company_state',
          'company_country', 'company_postal_code', 'company_phone', 'company_mobile',
          'company_email', 'company_website', 'company_tax_number', 'company_registration_number',
          'company_ntn', 'company_gst_number', 'bank_name', 'bank_account_title',
          'bank_account_number', 'bank_branch', 'bank_iban', 'bank_swift_code',
          'bank_name_2', 'bank_account_title_2', 'bank_account_number_2',
          'bank_branch_2', 'bank_iban_2', 'company_logo_url', 'company_slogan',
          'invoice_header_text', 'invoice_footer_text', 'currency_symbol',
          'currency_code', 'default_tax_percentage', 'default_credit_days'
        ];

        allowedFields.forEach(field => {
          if (settingsData.hasOwnProperty(field)) {
            insertFields.push(field);
            insertPlaceholders.push('?');
            insertValues.push(settingsData[field]);
          }
        });

        insertFields.push('updated_by');
        insertPlaceholders.push('?');
        insertValues.push(userId);

        const insertQuery = `
          INSERT INTO company_settings (${insertFields.join(', ')})
          VALUES (${insertPlaceholders.join(', ')})
        `;

        await db.query(insertQuery, insertValues);
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
        company_address: settings.company_address,
        company_city: settings.company_city,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_tax_number: settings.company_tax_number,
        company_logo_url: settings.company_logo_url,
        bank_name: settings.bank_name,
        bank_account_title: settings.bank_account_title,
        bank_account_number: settings.bank_account_number,
        bank_iban: settings.bank_iban
      };
    } catch (error) {
      console.error('❌ Error fetching invoice info:', error);
      throw error;
    }
  }
}

module.exports = CompanySettings;
