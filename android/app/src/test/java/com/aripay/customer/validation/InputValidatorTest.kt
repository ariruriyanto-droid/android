package com.aripay.customer.validation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InputValidatorTest {

    @Test
    fun testValidPhoneNumber_ReturnsTrue() {
        val result1 = InputValidator.validatePhone("081234567890")
        assertTrue(result1.isValid)

        val result2 = InputValidator.validatePhone("6281234567890")
        assertTrue(result2.isValid)
    }

    @Test
    fun testInvalidPhoneNumber_ReturnsFalse() {
        val empty = InputValidator.validatePhone("")
        assertFalse(empty.isValid)
        assertEquals("Nomor handphone wajib diisi", empty.message)

        val shortNumber = InputValidator.validatePhone("0812")
        assertFalse(shortNumber.isValid)
        assertEquals("Nomor handphone minimal 10 digit", shortNumber.message)

        val invalidPrefix = InputValidator.validatePhone("071234567890")
        assertFalse(invalidPrefix.isValid)
        assertEquals("Nomor harus diawali 08 atau 62", invalidPrefix.message)
    }

    @Test
    fun testPasswordValidation() {
        val validPass = InputValidator.validatePassword("secret123")
        assertTrue(validPass.isValid)

        val shortPass = InputValidator.validatePassword("12345")
        assertFalse(shortPass.isValid)
        assertEquals("Kata sandi minimal 6 karakter", shortPass.message)
    }

    @Test
    fun testRegisterValidation() {
        val valid = InputValidator.validateRegister(
            name = "Budi Santoso",
            phone = "08123456789",
            password = "password123",
            confirm = "password123"
        )
        assertTrue(valid.isValid)

        val mismatchedPass = InputValidator.validateRegister(
            name = "Budi Santoso",
            phone = "08123456789",
            password = "password123",
            confirm = "password999"
        )
        assertFalse(mismatchedPass.isValid)
        assertEquals("Kata sandi konfirmasi tidak cocok", mismatchedPass.message)

        val shortName = InputValidator.validateRegister(
            name = "A",
            phone = "08123456789",
            password = "password123",
            confirm = "password123"
        )
        assertFalse(shortName.isValid)
        assertEquals("Nama minimal 3 karakter", shortName.message)
    }
}
