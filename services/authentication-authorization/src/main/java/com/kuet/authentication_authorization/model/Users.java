package com.kuet.authentication_authorization.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Users {
    @Id
    private int id;
    private String username;
    private String firstname;
    private String lastname;
    private String password;
    private String email;
    private String phone;
    private String gender;
    private String upzilla;
    private String district;
    private String postcode;
    private String address;

    public Users(){}

    public Users(int id, String userName, String firstName, String lastName, String password, String email, String phone, String gender, String upzilla, String district, String postCode, String address) {
        this.id = id;
        this.username = userName;
        this.firstname = firstName;
        this.lastname = lastName;
        this.password = password;
        this.email = email;
        this.phone = phone;
        this.gender = gender;
        this.upzilla = upzilla;
        this.district = district;
        this.postcode = postCode;
        this.address = address;
    }

    public int getId() {
        return id;
    }

    public String getUserName() {
        return username;
    }

    public String getFirstName() {
        return firstname;
    }

    public String getLastName() {
        return lastname;
    }

    public String getPassword() {
        return password;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getGender() {
        return gender;
    }

    public String getUpzilla() {
        return upzilla;
    }

    public String getDistrict() {
        return district;
    }

    public String getPostCode() {
        return postcode;
    }

    public String getAddress() {
        return address;
    }

    public void setId(int id) {
        this.id = id;
    }

    public void setUserName(String userName) {
        this.username = userName;
    }

    public void setFirstName(String firstName) {
        this.firstname = firstName;
    }

    public void setLastName(String lastName) {
        this.lastname= lastName;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public void setUpzilla(String upzilla) {
        this.upzilla = upzilla;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public void setPostCode(String postCode) {
        this.postcode = postCode;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", userName='" + username + '\'' +
                ", firstName='" + firstname + '\'' +
                ", lastName='" + lastname + '\'' +
                ", password='" + password + '\'' +
                ", email='" + email + '\'' +
                ", phone='" + phone + '\'' +
                ", gender='" + gender + '\'' +
                ", upzilla='" + upzilla + '\'' +
                ", district='" + district + '\'' +
                ", postCode='" + postcode + '\'' +
                ", address='" + address + '\'' +
                '}';
    }
}
